import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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
  const { cicloId, targetAlunoId } = body ?? {}
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

  // Create new ciclo for target aluno
  const { data: novo, error: cicloError } = await admin.from('ciclos').insert({
    aluno_id: targetAlunoId,
    nome: rotina.nome,
    status: 'planejado',
    tipo: rotina.tipo,
    objetivo: rotina.objetivo,
    orientacoes: rotina.orientacoes,
    data_inicio: rotina.data_inicio,
    data_fim: rotina.data_fim,
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
      sessao.sessao_itens.map((item: any) => ({
        sessao_id: novaSessao.id,
        exercicio_id: item.exercicio_id ?? null,
        ordem: item.ordem,
        series: item.series,
        repeticoes: item.repeticoes,
        carga_kg: item.carga_kg,
        descanso_seg: item.descanso_seg,
        observacoes: item.observacoes,
        periodizacao_semanal: item.periodizacao_semanal,
        biset_grupo: item.biset_grupo,
      }))
    )
  }

  if (sessaoErrors.length > 0)
    return NextResponse.json({ sucesso: true, avisos: sessaoErrors })

  return NextResponse.json({ sucesso: true })
}
