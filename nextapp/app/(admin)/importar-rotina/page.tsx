import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ImportarRotinaClient } from './ImportarRotinaClient'

export default async function ImportarRotinaPage() {
  const supabase = await createClient()

  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, usuario:usuarios(nome)')
    .order('criado_em', { ascending: false })

  const lista = (alunos ?? []).map((a: any) => ({
    id: a.id as string,
    nome: (a.usuario?.nome ?? 'Sem nome') as string,
  }))

  return (
    <>
      <Header title="Importar Rotina" />
      <div className="p-6 max-w-3xl mx-auto">
        <ImportarRotinaClient alunos={lista} />
      </div>
    </>
  )
}
