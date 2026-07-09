import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { AlunosList } from './AlunosList'

export default async function AlunosPage() {
  const supabase = await createClient()

  const { data: alunos } = await supabase
    .from('alunos')
    .select(`
      *,
      usuario:usuarios(id, nome, email, avatar_url, data_nascimento),
      academia:academias(id, nome),
      score:scores(pontos_total, sequencia_atual, nivel, aderencia_mes)
    `)
    .order('criado_em', { ascending: false })

  return (
    <>
      <Header
        title="Alunos"
        actions={
          <Link href="/alunos/novo" className="btn-primary text-sm px-4 py-2">
            <UserPlus size={16} />
            Novo Aluno
          </Link>
        }
      />
      <div className="p-6">
        <AlunosList alunos={alunos ?? []} />
      </div>
    </>
  )
}
