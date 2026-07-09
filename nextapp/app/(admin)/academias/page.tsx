import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AcademiasClient } from './AcademiasClient'

export default async function AcademiasPage() {
  const supabase = await createClient()

  const { data: academias } = await supabase
    .from('academias')
    .select(`
      *,
      academia_equipamentos(*),
      exercicio_academias(*, exercicio:exercicios(id, nome, grupo_muscular)),
      alunos(id, usuario:usuarios(nome))
    `)
    .order('nome')

  const { data: exercicios } = await supabase
    .from('exercicios')
    .select('id, nome, grupo_muscular, categoria')
    .eq('ativo', true)
    .order('nome')

  return (
    <>
      <Header title="Gestão de Academias" />
      <div className="p-6">
        <AcademiasClient academias={academias ?? []} exercicios={exercicios ?? []} />
      </div>
    </>
  )
}
