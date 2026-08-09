import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  // Authenticated session client (anon key + cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })

  // 2. Admin role check
  const { data: usuario } = await supabase
    .from('usuarios').select('papel').eq('auth_id', user.id).single()
  if (usuario?.papel !== 'admin')
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 403 })

  // 3. Parse body
  const body = await request.json().catch(() => null)
  const { alunoId, tipo } = body ?? {}
  if (!alunoId || !['convite', 'redefinir_senha'].includes(tipo))
    return NextResponse.json({ sucesso: false, erro: 'Parâmetros inválidos' }, { status: 400 })

  // 4. Fetch email from DB — never trust frontend
  const { data: aluno } = await supabase
    .from('alunos')
    .select('usuario:usuarios(email)')
    .eq('id', alunoId)
    .single()
  const email = (aluno?.usuario as any)?.email as string | undefined
  if (!email)
    return NextResponse.json({ sucesso: false, erro: 'Email do aluno não encontrado' }, { status: 400 })

  // 5. Admin Supabase client (service role — never in frontend)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // ── Convite ──────────────────────────────────────────────────────────────────
  if (tipo === 'convite') {
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback`,
    })

    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return NextResponse.json({
          sucesso: false,
          erro: 'Este aluno já possui conta ativa. Use "Redefinir senha" para reenviar o acesso.',
        }, { status: 409 })
      }
      return NextResponse.json({ sucesso: false, erro: 'Não foi possível enviar o convite.' }, { status: 400 })
    }

    await supabase.from('alunos')
      .update({ ultimo_convite_enviado_em: new Date().toISOString() })
      .eq('id', alunoId)

    return NextResponse.json({ sucesso: true, email })
  }

  // ── Redefinir senha ───────────────────────────────────────────────────────────
  if (tipo === 'redefinir_senha') {
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/nova-senha`,
    })

    if (error)
      return NextResponse.json({ sucesso: false, erro: 'Não foi possível enviar o email de redefinição.' }, { status: 400 })

    await supabase.from('alunos')
      .update({ ultima_redefinicao_enviada_em: new Date().toISOString() })
      .eq('id', alunoId)

    return NextResponse.json({ sucesso: true, email })
  }

  return NextResponse.json({ sucesso: false, erro: 'Tipo inválido' }, { status: 400 })
}
