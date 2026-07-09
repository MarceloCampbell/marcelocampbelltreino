import { Header } from '@/components/layout/Header'
import { NovoAlunoForm } from './NovoAlunoForm'
import { createClient } from '@/lib/supabase/server'

export default async function NovoAlunoPage() {
  const supabase = await createClient()
  const { data: academias } = await supabase.from('academias').select('id, nome').eq('status', 'ativo')

  return (
    <>
      <Header title="Cadastro de Novo Aluno" />
      <div className="p-6 max-w-3xl mx-auto">
        <NovoAlunoForm academias={academias ?? []} />
      </div>
    </>
  )
}
