import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function gerarSenhaTemp(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'MC-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('papel').eq('auth_id', user.id).single()
  if (usuario?.papel !== 'admin')
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const { alunoId, tipo } = body ?? {}
  if (!alunoId || !['convite', 'redefinir_senha'].includes(tipo))
    return NextResponse.json({ sucesso: false, erro: 'Parâmetros inválidos' }, { status: 400 })

  // Busca email e auth_id do aluno
  const { data: aluno } = await supabase
    .from('alunos')
    .select('usuario:usuarios(email, auth_id)')
    .eq('id', alunoId)
    .single()
  const email = (aluno?.usuario as any)?.email as string | undefined
  const authId = (aluno?.usuario as any)?.auth_id as string | undefined
  if (!email || !authId)
    return NextResponse.json({ sucesso: false, erro: 'Dados do aluno não encontrados' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Gera nova senha temporária e atualiza o usuário
  const senhaTemporaria = gerarSenhaTemp()

  const { error } = await admin.auth.admin.updateUserById(authId, {
    password: senhaTemporaria,
    user_metadata: { needs_password_change: true },
  })

  if (error)
    return NextResponse.json({ sucesso: false, erro: 'Não foi possível gerar nova senha.' }, { status: 400 })

  const campo = tipo === 'convite' ? 'ultimo_convite_enviado_em' : 'ultima_redefinicao_enviada_em'
  await supabase.from('alunos')
    .update({ [campo]: new Date().toISOString() })
    .eq('id', alunoId)

  return NextResponse.json({ sucesso: true, email, senha_temporaria: senhaTemporaria })
}
