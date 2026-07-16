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

  const [sessoesRes, aerobicosRes] = await Promise.all([
    cicloId
      ? supabase
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

  return (
    <>
      <Header title="Meu Treino" />
      <div className="p-5 max-w-2xl">
        <TreinoAlunoClient
          alunoId={aluno.id}
          nomeAluno={usuario.nome}
          sessoes={sessoesRes.data ?? []}
          aerobicos={aerobicosRes.data ?? []}
          cicloAtivo={cicloAtivoRes.data ?? null}
        />
      </div>
    </>
  )
}
