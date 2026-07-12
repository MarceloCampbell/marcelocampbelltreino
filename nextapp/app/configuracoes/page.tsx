import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, telefone, data_nascimento, papel')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) redirect('/auth/login')

  return (
    <>
      <Header title="Configurações" />
      <div className="p-6 max-w-2xl">
        <ConfiguracoesClient usuario={usuario} />
      </div>
    </>
  )
}
