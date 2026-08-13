import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('usuarios').select('papel').eq('auth_id', user.id).single()
  if (adminUser?.papel !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await request.json()
  const { email, nome, telefone, data_nascimento } = body

  if (!email || !nome) return NextResponse.json({ error: 'Email e nome são obrigatórios' }, { status: 400 })

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // inviteUserByEmail cria o usuário E envia o email de boas-vindas em uma chamada só
  const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/nova-senha`,
    data: { nome },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Define app_metadata (papel) separadamente — inviteUserByEmail só aceita user_metadata via data
  await adminSupabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { papel: 'aluno' },
  })

  // Atualiza campos extras no perfil se fornecidos
  if (telefone || data_nascimento) {
    await supabase
      .from('usuarios')
      .update({ telefone: telefone || null, data_nascimento: data_nascimento || null })
      .eq('auth_id', authData.user.id)
  }

  const { data: usuario } = await adminSupabase
    .from('usuarios').select('id, auth_id, nome, email, papel')
    .eq('auth_id', authData.user.id).single()

  return NextResponse.json({ usuario })
}
