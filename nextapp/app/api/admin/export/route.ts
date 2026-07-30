import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alunoId = req.nextUrl.searchParams.get('aluno_id')
  const format = req.nextUrl.searchParams.get('format') ?? 'json'

  if (!alunoId) return NextResponse.json({ error: 'aluno_id required' }, { status: 400 })

  const [alunoRes, ciclsRes, sessionsRes, exsRes, scoresRes, notasRes] = await Promise.all([
    supabase
      .from('alunos')
      .select('*, usuario:usuarios(nome, email, telefone, data_nascimento)')
      .eq('id', alunoId)
      .single(),
    supabase
      .from('ciclos')
      .select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(nome, grupo_muscular)))')
      .eq('aluno_id', alunoId)
      .order('numero', { ascending: true }),
    supabase
      .from('workout_sessions')
      .select('*, set_executions(*)')
      .eq('aluno_id', alunoId)
      .order('iniciada_em', { ascending: false })
      .limit(200),
    supabase
      .from('exercicios')
      .select('id, nome, grupo_muscular')
      .limit(500),
    supabase
      .from('scores')
      .select('*')
      .eq('aluno_id', alunoId)
      .single(),
    supabase
      .from('anotacoes')
      .select('texto, criado_em')
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false }),
  ])

  const exportData = {
    exportado_em: new Date().toISOString(),
    aluno: alunoRes.data,
    score: scoresRes.data,
    anotacoes: notasRes.data ?? [],
    ciclos: ciclsRes.data ?? [],
    workout_sessions: sessionsRes.data ?? [],
  }

  if (format === 'csv') {
    // Flat CSV of set executions with exercise name
    const exMap: Record<string, string> = {}
    ;(exsRes.data ?? []).forEach(e => { exMap[e.id] = e.nome })

    const rows: string[] = ['data,exercicio,serie,carga_kg,repeticoes,concluida']
    ;(sessionsRes.data ?? []).forEach(s => {
      ;(s.set_executions as any[] ?? []).forEach((ex: any) => {
        const dt = s.iniciada_em?.split('T')[0] ?? ''
        rows.push([dt, '', ex.numero_serie, ex.carga_registrada ?? '', ex.repeticoes_feitas ?? '', ex.concluida ? '1' : '0'].join(','))
      })
    })

    const nome = (alunoRes.data?.usuario as any)?.nome?.replace(/[^a-z0-9]/gi, '_') ?? 'aluno'
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nome}_treinos.csv"`,
      },
    })
  }

  const nome = (alunoRes.data?.usuario as any)?.nome?.replace(/[^a-z0-9]/gi, '_') ?? 'aluno'
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${nome}_dados.json"`,
    },
  })
}
