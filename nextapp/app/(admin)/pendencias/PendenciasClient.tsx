'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PendenciaComAluno = {
  id: string
  aluno_id: string
  tipo: string
  prioridade: 'urgente' | 'alta' | 'media' | 'baixa'
  descricao: string
  resolvida: boolean
  criado_em: string
  aluno: {
    id: string
    plano_contratado: string | null
    usuario: { id: string; nome: string; avatar_url: string | null; email: string } | null
  } | null
}

const prioridadeConfig = {
  urgente: { label: 'Urgente', class: 'badge-urgente', bar: 'bg-red-700' },
  alta: { label: 'Alta', class: 'badge-alta', bar: 'bg-red-500' },
  media: { label: 'Média', class: 'badge-media', bar: 'bg-orange-400' },
  baixa: { label: 'Baixa', class: 'badge-baixa', bar: 'bg-blue-400' },
}

const tipoConfig: Record<string, { label: string; icon: string }> = {
  treino: { label: 'Treino', icon: '🏋️' },
  duvida: { label: 'Dúvida', icon: '❓' },
  financeiro: { label: 'Financeiro', icon: '💰' },
  feedback: { label: 'Feedback', icon: '📝' },
  avaliacao: { label: 'Avaliação', icon: '📊' },
}

interface Props {
  pendencias: PendenciaComAluno[]
}

export function PendenciasClient({ pendencias: initialPendencias }: Props) {
  const supabase = createClient()
  const [pendencias, setPendencias] = useState(initialPendencias)
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const filtradas = pendencias.filter(p => {
    if (filtroPrioridade !== 'todas' && p.prioridade !== filtroPrioridade) return false
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false
    return true
  })

  async function resolver(id: string) {
    await supabase.from('pendencias').update({ resolvida: true }).eq('id', id)
    setPendencias(prev => prev.filter(p => p.id !== id))
  }

  const counts = {
    urgente: pendencias.filter(p => p.prioridade === 'urgente').length,
    alta: pendencias.filter(p => p.prioridade === 'alta').length,
    media: pendencias.filter(p => p.prioridade === 'media').length,
    baixa: pendencias.filter(p => p.prioridade === 'baixa').length,
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider">Filtrar por prioridade</span>
          <div className="flex gap-1">
            {[
              { value: 'todas', label: 'Todas' },
              { value: 'urgente', label: 'Urgente' },
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Média' },
              { value: 'baixa', label: 'Baixa' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFiltroPrioridade(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filtroPrioridade === opt.value
                    ? 'bg-secondary text-white'
                    : 'bg-white border border-outline-variant text-secondary hover:bg-gray-50'
                }`}
              >
                {opt.label}
                {opt.value !== 'todas' && counts[opt.value as keyof typeof counts] > 0 && (
                  <span className="ml-1 opacity-70">({counts[opt.value as keyof typeof counts]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider">Filtrar por tipo</span>
          <div className="flex gap-1">
            {[{ value: 'todos', label: 'Todos' }, ...Object.entries(tipoConfig).map(([k, v]) => ({ value: k, label: v.label }))].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFiltroTipo(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filtroTipo === opt.value
                    ? 'bg-secondary text-white'
                    : 'bg-white border border-outline-variant text-secondary hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
          <p className="font-bold text-secondary text-lg">Tudo em dia!</p>
          <p className="text-sm text-outline mt-1">Nenhuma pendência aberta com esses filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map(pendencia => {
            const config = prioridadeConfig[pendencia.prioridade]
            const tipo = tipoConfig[pendencia.tipo]
            const aluno = pendencia.aluno
            const nome = aluno?.usuario?.nome ?? 'Aluno desconhecido'
            const plano = aluno?.plano_contratado ?? ''
            const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

            return (
              <div key={pendencia.id} className="bg-white rounded-xl shadow-card overflow-hidden flex">
                <div className={`w-1 flex-shrink-0 ${config.bar}`} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/alunos/${aluno?.id}`}>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-primary transition-all">
                          {initials}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/alunos/${aluno?.id}`} className="font-bold text-sm text-secondary hover:text-primary-dark">
                          {nome}
                        </Link>
                        {plano && (
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{plano}</p>
                        )}
                      </div>
                    </div>
                    <span className={config.class}>{config.label}</span>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                    {tipo && <span className="mr-1">{tipo.icon}</span>}
                    {pendencia.descricao}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-outline flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(pendencia.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolver(pendencia.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors px-2 py-1 rounded hover:bg-green-50"
                      >
                        <CheckCircle2 size={14} /> Resolver
                      </button>
                      <Link
                        href={`/alunos/${aluno?.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Ver aluno
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtradas.length > 0 && (
        <div className="mt-8 text-center">
          <button className="btn-secondary">
            Ver Mais Pendências
          </button>
        </div>
      )}
    </div>
  )
}
