import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { TreinoAlunoClient } from './TreinoAlunoClient'

export default async function TreinoAlunoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id, nome').eq('auth_id', user.id).single()
  if (!usuario) redirect('/auth/login')

  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) return <div className="p-6 text-center text-outline">Perfil de aluno não encontrado. Entre em contato com seu treinador.</div>

  const cicloAtivoRes = await supabase
    .from('ciclos')
    .select('id, nome, data_inicio, data_fim, status')
    .eq('aluno_id', aluno.id)
    .in('status', ['ativo', 'planejado'])
    .order('data_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  const cicloId = cicloAtivoRes.data?.id

  // Calculate start of the current cycle week for scoped completion check
  const weekStart = (() => {
    const dataInicio = cicloAtivoRes.data?.data_inicio
    if (!dataInicio) return null
    const inicio = new Date(dataInicio + 'T00:00')
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const days = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const weekNum = Math.max(0, Math.floor(days / 7))
    return new Date(inicio.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000).toISOString()
  })()

  const [sessoesRes, aerobicosRes] = await Promise.all([
    cicloId
      ? supabase
          .from('sessoes_treino')
          .select(`
            *,
            sessao_itens(
              *,
              exercicio:exercicios(
                id, nome, grupo_muscular, video_url, instrucoes, exercicio_substituto_id
              )
            )
          `)
          .eq('aluno_id', aluno.id)
          .eq('ciclo_id', cicloId)
          .order('ordem', { ascending: true })
          .limit(20)
      : Promise.resolve({ data: [] }),
    supabase
      .from('treinos_aerobicos')
      .select('id, nome, modalidade, duracao_estimada_min, distancia_estimada_km, intensidade_principal, status, data_prevista')
      .eq('aluno_id', aluno.id)
      .neq('status', 'cancelado')
      .order('data_prevista', { ascending: true })
      .limit(10),
  ])

  // Fetch which sessions were completed in the current week (for weekly reset)
  const sessaoIds = (sessoesRes.data ?? []).map((s: any) => s.id)
  let completedThisWeekIds: string[] = []
  if (sessaoIds.length > 0 && weekStart) {
    const { data: doneThisWeek } = await (supabase as any)
      .from('workout_sessions')
      .select('sessao_id')
      .eq('aluno_id', aluno.id)
      .in('status', ['concluido', 'incompleto'])
      .gte('concluido_em', weekStart)
      .in('sessao_id', sessaoIds)
    completedThisWeekIds = (doneThisWeek ?? []).map((r: any) => r.sessao_id)
  }

  return (
    <>
      <Header title="Meu Treino" />
      <div className="p-5 max-w-2xl">
        <TreinoAlunoClient
          nomeAluno={usuario.nome}
          sessoes={sessoesRes.data ?? []}
          aerobicos={aerobicosRes.data ?? []}
          cicloAtivo={cicloAtivoRes.data ?? null}
          completedThisWeekIds={completedThisWeekIds}
        />
      </div>
    </>
  )
}
