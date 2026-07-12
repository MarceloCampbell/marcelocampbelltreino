import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { FeedbackSemanalClient } from './FeedbackSemanalClient'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario!.id).single()
  if (!aluno) return <div className="p-6 text-center">Perfil não encontrado.</div>

  function getMondayOfWeek(date = new Date()) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const weekStart = getMondayOfWeek()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  const [feedbacks, sessoesFeitas, cardiosFeitos] = await Promise.all([
    supabase
      .from('feedbacks_semanais')
      .select('*')
      .eq('aluno_id', aluno.id)
      .order('semana_referencia', { ascending: false })
      .limit(10),
    supabase
      .from('sessoes_treino')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', aluno.id)
      .eq('status', 'realizado')
      .gte('updated_at', weekStartStr)
      .lte('updated_at', weekEndStr + 'T23:59:59'),
    supabase
      .from('treinos_aerobicos')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', aluno.id)
      .eq('status', 'feito')
      .gte('data_realizado', weekStartStr)
      .lte('data_realizado', weekEndStr),
  ])

  const autoData = {
    treinos_feitos: sessoesFeitas.count ?? 0,
    cardios_feitos: cardiosFeitos.count ?? 0,
    semana_inicio: weekStartStr,
    semana_fim: weekEndStr,
  }

  return (
    <>
      <Header title="Feedback Semanal" />
      <div className="p-6">
        <FeedbackSemanalClient alunoId={aluno.id} feedbacks={feedbacks.data ?? []} autoData={autoData} />
      </div>
    </>
  )
}
