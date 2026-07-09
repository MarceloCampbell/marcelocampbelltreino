import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { NovoTreinoForm } from './NovoTreinoForm'

export default async function NovoTreinoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [alunoResult, ciclosResult, exerciciosResult] = await Promise.all([
    supabase.from('alunos').select('id, usuario:usuarios(nome), academia_id').eq('id', params.id).single(),
    supabase.from('ciclos').select('*').eq('aluno_id', params.id).order('numero', { ascending: false }),
    supabase.from('exercicios').select('id, nome, grupo_muscular, equipamento').eq('ativo', true).order('grupo_muscular').order('nome'),
  ])

  if (!alunoResult.data) notFound()

  return (
    <>
      <Header title={`Treino – ${(alunoResult.data.usuario as any)?.nome ?? 'Aluno'}`} />
      <div className="p-6">
        <NovoTreinoForm
          alunoId={params.id}
          ciclos={ciclosResult.data ?? []}
          exercicios={exerciciosResult.data ?? []}
        />
      </div>
    </>
  )
}
