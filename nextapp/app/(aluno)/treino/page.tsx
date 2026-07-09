import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { TreinoAlunoClient } from './TreinoAlunoClient'

export default async function TreinoAlunoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  if (!usuario) redirect('/auth/login')

  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) return <div className="p-6 text-center text-outline">Perfil de aluno não encontrado. Entre em contato com seu treinador.</div>

  const { data: sessoes } = await supabase
    .from('sessoes_treino')
    .select(`
      *,
      sessao_itens(
        *,
        exercicio:exercicios(
          id, nome, grupo_muscular, video_url, instrucoes, exercicio_substituto_id,
          substituto:exercicios!exercicio_substituto_id(id, nome, grupo_muscular, video_url)
        )
      )
    `)
    .eq('aluno_id', aluno.id)
    .order('data', { ascending: false })
    .limit(20)

  return (
    <>
      <Header title="Meu Treino" />
      <div className="p-6">
        <TreinoAlunoClient alunoId={aluno.id} sessoes={sessoes ?? []} />
      </div>
    </>
  )
}
