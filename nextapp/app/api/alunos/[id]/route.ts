import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: adminUser } = await supabase.from('usuarios').select('papel').eq('auth_id', user.id).single()
  if (!adminUser || !['admin', 'assistente'].includes(adminUser.papel)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Get the aluno's auth_id before deleting
  const { data: aluno } = await supabaseAdmin
    .from('alunos')
    .select('id, usuario_id, usuario:usuarios(auth_id)')
    .eq('id', params.id)
    .single()

  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const authId = (aluno.usuario as any)?.auth_id

  // Delete the aluno record (cascade handles related records depending on FK setup)
  const { error: deleteAlunoErr } = await supabaseAdmin.from('alunos').delete().eq('id', params.id)
  if (deleteAlunoErr) return NextResponse.json({ error: deleteAlunoErr.message }, { status: 500 })

  // Delete the usuarios record
  if (aluno.usuario_id) {
    await supabaseAdmin.from('usuarios').delete().eq('id', aluno.usuario_id)
  }

  // Delete the auth user
  if (authId) {
    await supabaseAdmin.auth.admin.deleteUser(authId)
  }

  return NextResponse.json({ ok: true })
}
