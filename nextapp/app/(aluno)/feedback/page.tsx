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

  const { data: feedbacks } = await supabase
    .from('feedbacks_semanais')
    .select('*')
    .eq('aluno_id', aluno.id)
    .order('semana_referencia', { ascending: false })
    .limit(10)

  return (
    <>
      <Header title="Feedback Semanal" />
      <div className="p-6">
        <FeedbackSemanalClient alunoId={aluno.id} feedbacks={feedbacks ?? []} />
      </div>
    </>
  )
}
