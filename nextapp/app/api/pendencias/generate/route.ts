import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Keyword rules for auto-generating pendências
const RULES = [
  {
    pattern: /dor|doendo|machucado|lesão|lesao|inflamado|ardendo/i,
    tipo: 'avaliacao' as const,
    prioridade: 'urgente' as const,
    desc: (ctx: string) => `Aluno relatou dor/lesão: "${ctx.slice(0, 100)}"`,
  },
  {
    pattern: /não consegui|nao consegui|faltei|cancelei|não fiz|nao fiz/i,
    tipo: 'treino' as const,
    prioridade: 'media' as const,
    desc: (ctx: string) => `Aluno não completou treino: "${ctx.slice(0, 100)}"`,
  },
  {
    pattern: /dúvida|duvida|não entendi|nao entendi|como faço|como faco/i,
    tipo: 'duvida' as const,
    prioridade: 'media' as const,
    desc: (ctx: string) => `Aluno tem dúvida: "${ctx.slice(0, 100)}"`,
  },
  {
    pattern: /equipamento|aparelho|não tem|nao tem|quebrado|indisponível|indisponivel/i,
    tipo: 'treino' as const,
    prioridade: 'alta' as const,
    desc: (ctx: string) => `Equipamento indisponível relatado: "${ctx.slice(0, 100)}"`,
  },
  {
    pattern: /cancelar|desistir|parar|desanimo|desmotivado/i,
    tipo: 'feedback' as const,
    prioridade: 'alta' as const,
    desc: (ctx: string) => `Sinal de desmotivação: "${ctx.slice(0, 100)}"`,
  },
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { feedback_semanal_id, aluno_id } = await request.json()

  const { data: feedback } = await supabase
    .from('feedbacks_semanais')
    .select('*')
    .eq('id', feedback_semanal_id)
    .single()

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })

  const textos = [
    feedback.descricao_dor,
    feedback.o_que_atrapalhou,
    feedback.duvida_semana,
    feedback.exercicio_dificuldade,
    feedback.treino_mais_dificil,
  ].filter(Boolean).join(' ')

  const pendenciasToCreate = []

  // Auto-detect dor
  if (feedback.sentiu_dor) {
    pendenciasToCreate.push({
      aluno_id,
      tipo: 'avaliacao' as const,
      prioridade: 'urgente' as const,
      descricao: `Dor relatada no feedback semanal: "${feedback.descricao_dor ?? 'não especificado'}"`,
      resolvida: false,
    })
  }

  // Keyword analysis
  for (const rule of RULES) {
    if (rule.pattern.test(textos)) {
      pendenciasToCreate.push({
        aluno_id,
        tipo: rule.tipo,
        prioridade: rule.prioridade,
        descricao: rule.desc(textos),
        resolvida: false,
      })
      break
    }
  }

  // Low adherence
  if (feedback.aderencia_0_10 !== null && feedback.aderencia_0_10 <= 4) {
    pendenciasToCreate.push({
      aluno_id,
      tipo: 'feedback' as const,
      prioridade: 'alta' as const,
      descricao: `Baixa aderência relatada: ${feedback.aderencia_0_10}/10 — verificar motivo`,
      resolvida: false,
    })
  }

  if (pendenciasToCreate.length > 0) {
    await supabase.from('pendencias').insert(pendenciasToCreate)
  }

  return NextResponse.json({ created: pendenciasToCreate.length })
}
