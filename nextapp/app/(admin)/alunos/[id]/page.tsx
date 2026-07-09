import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { GestaoAlunoClient } from './GestaoAlunoClient'

export default async function GestaoAlunoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: aluno } = await supabase
    .from('alunos')
    .select(`
      *,
      usuario:usuarios(*),
      academia:academias(id, nome),
      score:scores(*),
      aluno_badges(
        conquistado_em,
        badge:badges(*)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!aluno) notFound()

  const [ciclosRes, exerciciosRes, feedbacksRes, pendenciasRes, anotacoesRes] = await Promise.all([
    supabase
      .from('ciclos')
      .select(`
        *,
        sessoes_treino(
          *,
          sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url))
        )
      `)
      .eq('aluno_id', params.id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('exercicios')
      .select('id, nome, grupo_muscular, categoria, equipamento, video_url, exercicio_substituto_id, musculo_primario, musculo_secundario, musculo_terciario, series_secundario, series_terciario')
      .eq('ativo', true)
      .order('nome'),
    supabase.from('feedbacks_semanais').select('*').eq('aluno_id', params.id).order('semana_referencia', { ascending: false }).limit(8),
    supabase.from('pendencias').select('*').eq('aluno_id', params.id).eq('resolvida', false),
    supabase.from('anotacoes').select('*, autor:usuarios(nome)').eq('aluno_id', params.id).order('criado_em', { ascending: false }),
  ])

  return (
    <>
      <Header title="Gestão de Aluno" />
      <div className="p-6">
        <GestaoAlunoClient
          aluno={aluno}
          ciclos={ciclosRes.data ?? []}
          exerciciosBiblioteca={exerciciosRes.data ?? []}
          feedbacks_semanais={feedbacksRes.data ?? []}
          pendencias={pendenciasRes.data ?? []}
          anotacoes={anotacoesRes.data ?? []}
        />
      </div>
    </>
  )
}
