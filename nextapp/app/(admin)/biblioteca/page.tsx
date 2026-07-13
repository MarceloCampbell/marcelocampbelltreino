import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { BibliotecaClient } from './BibliotecaClient'

export default async function BibliotecaPage() {
  const supabase = await createClient()
  const [{ data: exercicios }, { data: academias }] = await Promise.all([
    supabase
      .from('exercicios')
      .select('*, exercicio_academias(academia_id)')
      .order('grupo_muscular')
      .order('nome'),
    supabase
      .from('academias')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome'),
  ])

  return (
    <>
      <Header title="Biblioteca de Exercícios" />
      <div className="p-6">
        <BibliotecaClient exercicios={exercicios ?? []} academias={academias ?? []} />
      </div>
    </>
  )
}
