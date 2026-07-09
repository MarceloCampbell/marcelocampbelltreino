import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ComunicadosClient } from './ComunicadosClient'

export default async function ComunicadosPage() {
  const supabase = await createClient()
  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*, autor:usuarios(nome)')
    .order('enviado_em', { ascending: false })

  return (
    <>
      <Header title="Comunicados" />
      <div className="p-6">
        <ComunicadosClient comunicados={comunicados ?? []} />
      </div>
    </>
  )
}
