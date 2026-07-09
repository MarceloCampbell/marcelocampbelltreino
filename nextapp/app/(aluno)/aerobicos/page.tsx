import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AerobicosAlunoClient } from './AerobicosAlunoClient'

export default async function AerobicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario!.id).single()
  if (!aluno) return <div className="p-6 text-center">Perfil não encontrado.</div>

  const { data: aerobicos } = await supabase
    .from('treinos_aerobicos')
    .select('*, treino_aerobico_blocos(*)')
    .eq('aluno_id', aluno.id)
    .order('data_prevista', { ascending: false })
    .limit(20)

  return (
    <>
      <Header title="Treinos Aeróbicos" />
      <div className="p-6">
        <AerobicosAlunoClient alunoId={aluno.id} aerobicos={aerobicos ?? []} />
      </div>
    </>
  )
}
