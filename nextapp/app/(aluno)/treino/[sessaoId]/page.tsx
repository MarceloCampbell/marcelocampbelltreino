import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ExecucaoClient } from './ExecucaoClient'

export default async function ExecucaoTreinoPage({ params }: { params: { sessaoId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  if (!usuario) redirect('/auth/login')

  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) notFound()

  const { data: sessao } = await supabase
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
    .eq('id', params.sessaoId)
    .eq('aluno_id', aluno.id)
    .single()

  if (!sessao) notFound()

  const { data: ciclo } = sessao.ciclo_id
    ? await supabase.from('ciclos').select('id, nome, data_inicio, data_fim').eq('id', sessao.ciclo_id).single()
    : { data: null }

  return <ExecucaoClient alunoId={aluno.id} sessao={sessao as any} ciclo={ciclo as any} />
}
