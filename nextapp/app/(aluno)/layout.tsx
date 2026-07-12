import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) redirect('/auth/login')

  const { count: totalFeed } = await supabase
    .from('comunicados')
    .select('id', { count: 'exact', head: true })
    .gte('enviado_em', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar usuario={usuario} totalFeed={totalFeed ?? 0} />
      <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
