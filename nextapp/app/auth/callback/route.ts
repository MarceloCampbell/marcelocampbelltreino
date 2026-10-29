import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Collect cookies to apply to the redirect response explicitly.
  // Using NextResponse.redirect() creates a new response object, so cookies
  // set via next/headers cookieStore would be lost. We collect them here and
  // set them manually so the browser receives the session on redirect.
  const cookiesToSet: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => cs.forEach(c => cookiesToSet.push(c)),
      },
    }
  )

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'invite' | 'magiclink' | 'email_change' | 'recovery' | null

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=link-expirado`, { status: 303 })
    }
    const redirectMap: Record<string, string> = {
      recovery: '/auth/nova-senha',
      invite: '/auth/nova-senha',
      signup: '/auth/login?confirmado=1',
      magiclink: '/',
      email_change: '/',
    }
    const dest = redirectMap[type] ?? next
    const response = NextResponse.redirect(`${origin}${dest}`, { status: 303 })
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, { ...options, sameSite: 'lax', path: '/' })
    )
    return response
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=link-expirado`, { status: 303 })
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`, { status: 303 })
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, { ...options, sameSite: 'lax', path: '/' })
  )
  return response
}
