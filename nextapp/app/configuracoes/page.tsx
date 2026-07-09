import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { redirect } from 'next/navigation'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('*').eq('auth_id', user!.id).single()
  if (!usuario) redirect('/auth/login')

  const isAdmin = usuario.papel === 'admin' || usuario.papel === 'assistente'

  return (
    <>
      <Header title="Configurações" />
      <div className="p-6 max-w-2xl">
        <div className="card">
          <h2 className="font-extrabold text-secondary mb-6">Meu Perfil</h2>
          <dl className="space-y-4">
            {([
              ['Nome', usuario.nome],
              ['E-mail', usuario.email],
              ...(isAdmin ? [['Papel', usuario.papel]] : []),
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-outline-variant pb-3">
                <dt className="text-xs font-semibold text-outline uppercase tracking-wider">{k}</dt>
                <dd className="text-sm font-medium text-secondary">{v ?? '–'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  )
}
