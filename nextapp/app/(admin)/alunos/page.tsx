import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { AlunosList } from './AlunosList'

export default async function AlunosPage() {
  const supabase = await createClient()

  const [alunosResult, notasResult] = await Promise.all([
    supabase
      .from('alunos')
      .select(`
        *,
        usuario:usuarios(id, nome, email, avatar_url, data_nascimento, telefone),
        academia:academias(id, nome),
        score:scores(pontos_total, sequencia_atual, nivel, aderencia_mes)
      `)
      .order('criado_em', { ascending: false }),
    supabase
      .from('anotacoes')
      .select('aluno_id, texto, criado_em')
      .order('criado_em', { ascending: false }),
  ])

  const lastNotaMap: Record<string, { texto: string; criado_em: string }> = {}
  ;(notasResult.data ?? []).forEach(n => {
    if (!lastNotaMap[n.aluno_id]) lastNotaMap[n.aluno_id] = { texto: n.texto, criado_em: n.criado_em }
  })

  const alunos = (alunosResult.data ?? []).map(a => ({
    ...a,
    lastNota: lastNotaMap[a.id] ?? null,
  }))

  return (
    <>
      <Header
        title="Alunos"
        showGlobalSearch
        actions={
          <Link href="/alunos/novo" className="btn-primary text-sm px-4 py-2">
            <UserPlus size={16} />
            Novo Aluno
          </Link>
        }
      />
      <div className="p-6">
        <AlunosList alunos={alunos} />
      </div>
    </>
  )
}
