import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PainelClient } from './PainelClient'

export default async function PainelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekLaterStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]

  const [alunosResult, scoresResult, pendsResult] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, data_renovacao, status, usuario:usuarios(nome, telefone)')
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false }),
    supabase
      .from('scores')
      .select('aluno_id, aderencia_mes, sequencia_atual'),
    supabase
      .from('pendencias')
      .select('id')
      .eq('status', 'aberta'),
  ])

  const alunos = alunosResult.data ?? []
  const scores = scoresResult.data ?? []

  const scoreMap: Record<string, { aderencia_mes: number; sequencia_atual: number }> = {}
  scores.forEach(s => { scoreMap[s.aluno_id] = s })

  const terminandoCiclo = alunos
    .filter(a => a.data_renovacao && a.data_renovacao >= todayStr && a.data_renovacao <= weekLaterStr)
    .map(a => ({
      id: a.id,
      nome: (a.usuario as any)?.nome ?? 'Aluno',
      diasRestantes: Math.ceil((new Date(a.data_renovacao!).getTime() - today.getTime()) / 86400000),
    }))

  const emRisco = alunos
    .filter(a => {
      const ad = scoreMap[a.id]?.aderencia_mes ?? 0
      return ad < 70 && ad > 0
    })
    .map(a => ({
      id: a.id,
      nome: (a.usuario as any)?.nome ?? 'Aluno',
      aderencia: scoreMap[a.id]?.aderencia_mes ?? 0,
      telefone: (a.usuario as any)?.telefone?.replace(/\D/g, '') || undefined,
    }))

  return (
    <PainelClient data={{
      totalAlunos: alunos.length,
      totalPendencias: pendsResult.data?.length ?? 0,
      terminandoCiclo,
      emRisco,
    }} />
  )
}
