import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function calcNumSemanas(inicio: string, fim: string): number {
  const d1 = new Date(inicio), d2 = new Date(fim)
  if (d2 <= d1) return 1
  return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 7)))
}

function resizePeriodizacao(original: any[], targetWeeks: number): any[] {
  if (!original || original.length === 0) return Array.from({ length: targetWeeks }, (_, i) => ({ semana: i + 1 }))
  if (original.length === targetWeeks) return original
  if (original.length > targetWeeks) return original.slice(0, targetWeeks).map((p, i) => ({ ...p, semana: i + 1 }))
  // Extend: repeat the last week's pattern for added weeks (carga is zeroed at item level)
  const last = original[original.length - 1]
  const extra = Array.from({ length: targetWeeks - original.length }, (_, i) => ({
    ...last,
    semana: original.length + i + 1,
    carga_kg: null,
  }))
  return [...original.map((p, i) => ({ ...p, semana: i + 1 })), ...extra]
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('papel').eq('auth_id', user.id).single()
  if (usuario?.papel !== 'admin')
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const { cicloId, targetAlunoId, nome: nomeOverride, data_inicio: dataInicioOverride, data_fim: dataFimOverride } = body ?? {}
  if (!cicloId || !targetAlunoId)
    return NextResponse.json({ sucesso: false, erro: 'Parâmetros inválidos' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch full rotina
  const { data: rotina, error: rotinaError } = await admin
    .from('ciclos')
    .select('*, sessoes_treino(*, sessao_itens(*))')
    .eq('id', cicloId)
    .single()

  if (rotinaError || !rotina)
    return NextResponse.json({ sucesso: false, erro: 'Rotina não encontrada' }, { status: 404 })

  const dataInicio = dataInicioOverride || rotina.data_inicio
  const dataFim = dataFimOverride || rotina.data_fim

  // Recalculate week count if dates changed
  const originalWeeks = rotina.data_inicio && rotina.data_fim
    ? calcNumSemanas(rotina.data_inicio, rotina.data_fim)
    : null
  const newWeeks = dataInicio && dataFim
    ? calcNumSemanas(dataInicio, dataFim)
    : originalWeeks

  // Create new ciclo for target aluno
  const { data: novo, error: cicloError } = await admin.from('ciclos').insert({
    aluno_id: targetAlunoId,
    nome: nomeOverride?.trim() || rotina.nome,
    status: 'planejado',
    tipo: rotina.tipo,
    objetivo: rotina.objetivo,
    orientacoes: rotina.orientacoes,
    data_inicio: dataInicio,
    data_fim: dataFim,
    visivel_antes_de_iniciar: rotina.visivel_antes_de_iniciar,
    ocultar_ao_vencer: rotina.ocultar_ao_vencer,
  }).select('id').single()

  if (cicloError || !novo)
    return NextResponse.json({ sucesso: false, erro: 'Erro ao criar rotina: ' + cicloError?.message }, { status: 500 })

  // Create sessoes and items
  const sessaoErrors: string[] = []
  for (const sessao of (rotina.sessoes_treino ?? [])) {
    const { data: novaSessao, error: sessaoError } = await admin.from('sessoes_treino').insert({
      aluno_id: targetAlunoId,
      ciclo_id: novo.id,
      nome: sessao.nome,
      tipo: sessao.tipo,
      dia_letra: sessao.dia_letra,
      dia_semana_numero: sessao.dia_semana_numero,
      orientacoes_aluno: sessao.orientacoes_aluno,
      observacoes: sessao.observacoes,
      tipo_aerobico: sessao.tipo_aerobico,
      status: 'pendente',
      ordem: sessao.ordem,
    }).select('id').single()

    if (sessaoError || !novaSessao) {
      sessaoErrors.push(`Sessão "${sessao.nome}": ${sessaoError?.message}`)
      continue
    }
    if (!sessao.sessao_itens?.length) continue

    await admin.from('sessao_itens').insert(
      sessao.sessao_itens.map((item: any) => {
        const periodizacao = (newWeeks && newWeeks !== originalWeeks && item.periodizacao_semanal)
          ? resizePeriodizacao(item.periodizacao_semanal, newWeeks)
          : item.periodizacao_semanal

        // Zero out cargas in the copy (original student's loads don't apply to new student)
        const periodizacaoSemCarga = periodizacao
          ? periodizacao.map((p: any) => ({ ...p, carga_kg: null }))
          : periodizacao

        return {
          sessao_id: novaSessao.id,
          exercicio_id: item.exercicio_id ?? null,
          ordem: item.ordem,
          series: item.series,
          repeticoes: item.repeticoes,
          carga_kg: null,
          descanso_seg: item.descanso_seg,
          observacoes: item.observacoes,
          periodizacao_semanal: periodizacaoSemCarga,
          biset_grupo: item.biset_grupo,
          ...(item.metodo ? { metodo: item.metodo, metodo_params: item.metodo_params ?? null } : {}),
        }
      })
    )
  }

  if (sessaoErrors.length > 0)
    return NextResponse.json({ sucesso: true, avisos: sessaoErrors })

  return NextResponse.json({ sucesso: true })
}
