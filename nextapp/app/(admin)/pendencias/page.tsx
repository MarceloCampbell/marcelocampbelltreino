import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PendenciasClient } from './PendenciasClient'

export default async function PendenciasPage() {
  const supabase = await createClient()

  const { data: pendencias } = await supabase
    .from('pendencias')
    .select(`
      *,
      aluno:alunos(
        id,
        plano_contratado,
        usuario:usuarios(id, nome, avatar_url, email)
      )
    `)
    .eq('resolvida', false)
    .order('criado_em', { ascending: false })

  return (
    <>
      <Header title="Pendências da Consultoria" />
      <div className="p-6">
        <p className="text-sm text-outline mb-6">
          Acompanhe as solicitações e ajuste pendências dos seus alunos.
        </p>
        <PendenciasClient pendencias={pendencias ?? []} />
      </div>
    </>
  )
}
