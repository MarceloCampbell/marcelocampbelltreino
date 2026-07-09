import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { NovoAerobicoForm } from './NovoAerobicoForm'

export default async function NovoAerobicoPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const [alunoResult, ciclosResult] = await Promise.all([
    supabase.from('alunos').select('id, usuario:usuarios(nome)').eq('id', params.id).single(),
    supabase.from('ciclos').select('id, nome, numero').eq('aluno_id', params.id).order('numero', { ascending: false }),
  ])
  if (!alunoResult.data) notFound()

  return (
    <>
      <Header title={`Treino Aeróbico – ${(alunoResult.data.usuario as any)?.nome}`} />
      <div className="p-6">
        <NovoAerobicoForm alunoId={params.id} ciclos={ciclosResult.data ?? []} />
      </div>
    </>
  )
}
