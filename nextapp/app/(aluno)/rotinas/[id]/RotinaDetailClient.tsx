'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronUp, Dumbbell, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SessaoItem = {
  id: string
  ordem: number
  series: number | null
  repeticoes: string | null
  carga_kg: number | null
  descanso_seg: number | null
  observacoes: string | null
  periodizacao_semanal: any
  biset_grupo: string | null
  exercicio: {
    id: string
    nome: string
    grupo_muscular: string
    video_url: string | null
    instrucoes: string | null
    exercicio_substituto_id: string | null
    substituto: { id: string; nome: string; grupo_muscular: string; video_url: string | null } | null
  } | null
}

type Sessao = {
  id: string
  nome: string
  tipo: string
  dia_letra: string | null
  dia_semana_numero: number | null
  status: string
  duracao_min: number | null
  intensidade: string | null
  observacoes: string | null
  orientacoes_aluno: string | null
  sessao_itens: SessaoItem[]
}

type Ciclo = {
  id: string
  nome: string
  data_inicio: string | null
  data_fim: string | null
  status: string
  numero: number
  tema: string | null
}

function SessaoCard({ sessao, highlight }: { sessao: Sessao; highlight: boolean }) {
  const [isOpen, setIsOpen] = useState(highlight)
  const router = useRouter()
  const isRealizado = sessao.status === 'realizado'
  const itens = [...(sessao.sessao_itens ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${highlight ? 'ring-2 ring-primary shadow-lg' : 'shadow-card'}`}>
      <button className="w-full flex items-center gap-4 p-5 text-left" onClick={() => setIsOpen(!isOpen)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isRealizado ? 'bg-green-100' : highlight ? 'bg-primary' : 'bg-blue-50'}`}>
          {isRealizado
            ? <CheckCircle2 size={20} className="text-green-600" />
            : <Dumbbell size={20} className={highlight ? 'text-white' : 'text-primary'} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-secondary">{sessao.nome}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-outline flex-wrap">
            {sessao.dia_letra && <span>Treino {sessao.dia_letra}</span>}
            {sessao.duracao_min && <span>· {sessao.duracao_min} min</span>}
            {sessao.intensidade && <span>· {sessao.intensidade}</span>}
            <span>· {itens.length} exercício{itens.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isRealizado ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isRealizado ? 'Concluído' : 'Pendente'}
          </span>
          {isOpen ? <ChevronUp size={16} className="text-outline" /> : <ChevronDown size={16} className="text-outline" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-outline-variant">
          {(sessao.observacoes || sessao.orientacoes_aluno) && (
            <div className="px-5 py-3 bg-blue-50 text-sm text-primary">
              📋 {sessao.orientacoes_aluno || sessao.observacoes}
            </div>
          )}

          <div className="px-5 pt-4 pb-4">
            <button
              onClick={() => router.push(`/treino/${sessao.id}`)}
              className="btn-primary w-full"
            >
              <Play size={15} />
              {isRealizado ? 'Refazer Treino' : 'Iniciar Treino'}
            </button>
          </div>

          {itens.length > 0 && (
            <div className="px-5 pb-5 space-y-2">
              {itens.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm text-secondary py-1">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-outline flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {item.ordem ?? ''}
                  </span>
                  <span className="font-medium truncate">{item.exercicio?.nome ?? '–'}</span>
                  {(item.series || item.repeticoes) && (
                    <span className="text-outline text-xs ml-auto flex-shrink-0">
                      {item.series && item.repeticoes ? `${item.series}×${item.repeticoes}` : (item.series ?? item.repeticoes)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RotinaDetailClient({
  ciclo,
  sessoes,
  alunoId,
}: {
  ciclo: Ciclo
  sessoes: Sessao[]
  alunoId: string
  semanaAtual?: number
}) {
  const supabase = createClient()

  useEffect(() => {
    supabase.from('access_logs').insert({
      aluno_id: alunoId,
      tipo: 'rotina_visualizada',
      referencia_id: ciclo.id,
    }).then(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hoje = new Date().getDay()
  const isAtivo = ciclo.status === 'ativo'

  const musculacaoSessoes = sessoes.filter(s => s.tipo !== 'aerobico')
  const treinoHoje = isAtivo
    ? (musculacaoSessoes.find(s => s.dia_semana_numero !== null && s.dia_semana_numero === hoje) ?? null)
    : null

  return (
    <div className="space-y-4">
      {treinoHoje && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="font-bold text-secondary text-sm uppercase tracking-wide">Treino de Hoje</h2>
          </div>
          <SessaoCard sessao={treinoHoje} highlight />
          {sessoes.length > 1 && (
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-outline-variant" />
              <h2 className="font-bold text-secondary text-sm uppercase tracking-wide">Todos os Treinos</h2>
            </div>
          )}
        </>
      )}
      {sessoes
        .filter(s => s.id !== treinoHoje?.id)
        .map(s => (
          <SessaoCard key={s.id} sessao={s} highlight={false} />
        ))
      }
    </div>
  )
}
