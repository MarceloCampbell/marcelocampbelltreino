'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/auth/login?error=credenciais')
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('auth_id', user!.id)
    .single()

  revalidatePath('/', 'layout')

  if (usuario?.papel === 'aluno') {
    redirect('/treino')
  }

  redirect('/pendencias')
}
