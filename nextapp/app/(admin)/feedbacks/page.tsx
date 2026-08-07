import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { FeedbacksClient } from './FeedbacksClient'

export default async function FeedbacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: feedbacks } = await supabase
    .from('workout_feedbacks')
    .select(`
      *,
      aluno:alunos(id, usuario:usuarios(nome))
    `)
    .order('criado_em', { ascending: false })
    .limit(100)

  return (
    <>
      <Header title="Feedbacks de Treino" />
      <div className="p-6">
        <FeedbacksClient feedbacks={feedbacks ?? []} />
      </div>
    </>
  )
}
