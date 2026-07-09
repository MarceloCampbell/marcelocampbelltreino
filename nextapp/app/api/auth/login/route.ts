import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const origin = request.nextUrl.origin

  const cookiesToSet: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) {
          cookies.forEach(c => cookiesToSet.push(c))
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=credenciais`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('auth_id', user!.id)
    .single()

  const destino = usuario?.papel === 'aluno' ? '/treino' : '/pendencias'
  const response = NextResponse.redirect(`${origin}${destino}`, { status: 303 })

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, { ...options, secure: false, sameSite: 'lax', path: '/' })
  })

  return response
}
