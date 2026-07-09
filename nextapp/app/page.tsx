import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) redirect('/auth/login')

  if (usuario.papel === 'aluno') redirect('/treino')
  redirect('/pendencias')
}
