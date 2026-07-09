import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BibliotecaClient } from './BibliotecaClient'

export default async function BibliotecaPage() {
  const supabase = await createClient()
  const { data: exercicios } = await supabase
    .from('exercicios')
    .select('*')
    .order('grupo_muscular')
    .order('nome')

  return (
    <>
      <Header title="Biblioteca de Exercícios" />
      <div className="p-6">
        <BibliotecaClient exercicios={exercicios ?? []} />
      </div>
    </>
  )
}
