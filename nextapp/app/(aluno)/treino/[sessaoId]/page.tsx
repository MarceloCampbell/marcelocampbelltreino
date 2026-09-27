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
          id, nome, grupo_muscular, video_url, instrucoes, exercicio_substituto_id
        )
      )
    `)
    .eq('id', params.sessaoId)
    .eq('aluno_id', aluno.id)
    .single()

  if (!sessao) notFound()

  // Fetch substituto exercises in a separate query to avoid PostgREST self-join issues
  const substitutoIds = ((sessao as any).sessao_itens ?? [])
    .map((item: any) => item.exercicio?.exercicio_substituto_id)
    .filter(Boolean) as string[]

  let substitutoMap: Record<string, any> = {}
  if (substitutoIds.length > 0) {
    const { data: substitutos } = await supabase
      .from('exercicios')
      .select('id, nome, grupo_muscular, video_url')
      .in('id', substitutoIds)
    if (substitutos) {
      substitutoMap = Object.fromEntries(substitutos.map((s: any) => [s.id, s]))
    }
  }

  // Merge substituto data into each sessao_item
  const sessaoComSubstitutos = {
    ...(sessao as any),
    sessao_itens: ((sessao as any).sessao_itens ?? []).map((item: any) => ({
      ...item,
      exercicio: item.exercicio ? {
        ...item.exercicio,
        substituto: item.exercicio.exercicio_substituto_id
          ? (substitutoMap[item.exercicio.exercicio_substituto_id] ?? null)
          : null,
      } : null,
    })),
  }

  const { data: ciclo } = sessao.ciclo_id
    ? await supabase.from('ciclos').select('id, nome, data_inicio, data_fim').eq('id', sessao.ciclo_id).single()
    : { data: null }

  return <ExecucaoClient alunoId={aluno.id} sessao={sessaoComSubstitutos as any} ciclo={ciclo as any} />
}
