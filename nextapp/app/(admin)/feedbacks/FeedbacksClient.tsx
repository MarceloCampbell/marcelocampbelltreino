'use client'

import { useState } from 'react'
import { AlertCircle, MessageSquare, CheckCircle2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Feedback = {
  id: string
  aluno_id: string
  sessao_id: string | null
  workout_session_id: string | null
  energia_nivel: number | null
  progresso_carga: string | null
  exercicio_mais_dificil: string | null
  melhor_momento: string | null
  sentiu_dor: boolean
  descricao_dor: string | null
  obstaculos: string | null
  pergunta_marcelo: string | null
  peso_atual: number | null
  exercicios_incompletos: { nome: string; motivo: string }[] | null
  respondido: boolean
  resposta_admin: string | null
  visto_em: string | null
  criado_em: string
  aluno: { id: string; usuario: { nome: string } | null } | null
}

const PROGRESSO_LABEL: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
  em_alguns: 'Em alguns',
}

function isUrgente(f: Feedback) {
  return f.sentiu_dor || (f.exercicios_incompletos?.length ?? 0) > 0
}

export function FeedbacksClient({ feedbacks: initial }: { feedbacks: Feedback[] }) {
  const supabase = createClient()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initial)
  const [subTab, setSubTab] = useState<'todos' | 'urgente'>('todos')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [resposta, setResposta] = useState('')
  const [saving, setSaving] = useState(false)

  const lista = subTab === 'urgente'
    ? feedbacks.filter(isUrgente)
    : feedbacks

  const urgenteCount = feedbacks.filter(f => isUrgente(f) && !f.respondido).length

  async function marcarVisto(id: string) {
    await supabase.from('workout_feedbacks').update({ visto_em: new Date().toISOString() }).eq('id', id)
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, visto_em: new Date().toISOString() } : f))
  }

  async function enviarResposta(id: string) {
    if (!resposta.trim()) return
    setSaving(true)
    await supabase.from('workout_feedbacks').update({
      resposta_admin: resposta.trim(),
      respondido: true,
      visto_em: new Date().toISOString(),
    }).eq('id', id)
    setFeedbacks(prev => prev.map(f => f.id === id
      ? { ...f, resposta_admin: resposta.trim(), respondido: true, visto_em: new Date().toISOString() }
      : f
    ))
    setRespondingId(null)
    setResposta('')
    setSaving(false)
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab('todos')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${subTab === 'todos' ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary hover:bg-gray-50'}`}
        >
          Todos ({feedbacks.length})
        </button>
        <button
          onClick={() => setSubTab('urgente')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${subTab === 'urgente' ? 'bg-red-500 text-white' : 'bg-white border border-outline-variant text-secondary hover:bg-gray-50'}`}
        >
          <AlertCircle size={14} />
          Urgente
          {urgenteCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${subTab === 'urgente' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
              {urgenteCount}
            </span>
          )}
        </button>
      </div>

      {lista.length === 0 && (
        <div className="text-center py-16 text-outline">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum feedback {subTab === 'urgente' ? 'urgente' : 'registrado'}</p>
        </div>
      )}

      <div className="space-y-4">
        {lista.map(f => {
          const urgente = isUrgente(f)
          const alunoNome = (f.aluno?.usuario as any)?.nome ?? 'Aluno'
          const data = new Date(f.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          return (
            <div
              key={f.id}
              className={`card ${urgente ? 'border-l-4 border-l-red-400' : ''} ${!f.visto_em ? 'bg-blue-50/30' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`/alunos/${f.aluno_id}`} className="font-bold text-secondary hover:underline">{alunoNome}</a>
                    {urgente && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} /> Urgente
                      </span>
                    )}
                    {f.respondido && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Respondido
                      </span>
                    )}
                    {!f.visto_em && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Novo</span>
                    )}
                  </div>
                  <p className="text-xs text-outline mt-0.5">{data}</p>
                </div>
                {!f.visto_em && (
                  <button
                    onClick={() => marcarVisto(f.id)}
                    className="text-xs font-semibold text-outline hover:text-secondary transition-colors flex-shrink-0"
                  >
                    Marcar visto
                  </button>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {f.energia_nivel !== null && (
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-primary">{f.energia_nivel}/10</p>
                    <p className="text-[10px] text-outline mt-0.5">Energia</p>
                  </div>
                )}
                {f.progresso_carga && (
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className={`text-sm font-extrabold ${f.progresso_carga === 'sim' ? 'text-green-600' : f.progresso_carga === 'nao' ? 'text-red-500' : 'text-orange-500'}`}>
                      {PROGRESSO_LABEL[f.progresso_carga]}
                    </p>
                    <p className="text-[10px] text-outline mt-0.5">Progresso carga</p>
                  </div>
                )}
                {f.peso_atual !== null && (
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-secondary">{f.peso_atual}kg</p>
                    <p className="text-[10px] text-outline mt-0.5">Peso</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {f.exercicio_mais_dificil && (
                  <p><span className="font-semibold text-secondary">Mais difícil:</span> <span className="text-outline">{f.exercicio_mais_dificil}</span></p>
                )}
                {f.melhor_momento && (
                  <p><span className="font-semibold text-secondary">Melhor momento:</span> <span className="text-outline">{f.melhor_momento}</span></p>
                )}
                {f.sentiu_dor && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <p className="font-semibold text-red-700 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Dor ou desconforto relatado
                    </p>
                    {f.descricao_dor && <p className="text-red-600 text-xs mt-0.5">{f.descricao_dor}</p>}
                  </div>
                )}
                {f.exercicios_incompletos && f.exercicios_incompletos.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                    <p className="font-semibold text-orange-700 mb-1.5">Exercícios não concluídos:</p>
                    <ul className="space-y-1">
                      {f.exercicios_incompletos.map((ex, i) => (
                        <li key={i} className="text-xs text-orange-600">
                          <span className="font-medium">{ex.nome}</span> — {ex.motivo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {f.obstaculos && (
                  <p><span className="font-semibold text-secondary">Obstáculos:</span> <span className="text-outline">{f.obstaculos}</span></p>
                )}
                {f.pergunta_marcelo && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5">
                    <p className="font-semibold text-purple-700 mb-0.5">Pergunta:</p>
                    <p className="text-purple-600 text-sm">{f.pergunta_marcelo}</p>
                  </div>
                )}
              </div>

              {/* Admin response */}
              {f.resposta_admin && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-green-700 mb-1">Resposta do Marcelo:</p>
                  <p className="text-sm text-green-800">{f.resposta_admin}</p>
                </div>
              )}

              {/* Response form */}
              {respondingId === f.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="input min-h-[80px] text-sm"
                    placeholder="Escreva sua resposta para o aluno..."
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => enviarResposta(f.id)} disabled={saving || !resposta.trim()} className="btn-primary text-sm px-4 py-1.5">
                      {saving ? 'Enviando...' : 'Enviar Resposta'}
                    </button>
                    <button onClick={() => { setRespondingId(null); setResposta('') }} className="btn-ghost text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setRespondingId(f.id); setResposta(f.resposta_admin ?? '') }}
                  className="mt-3 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  {f.resposta_admin ? 'Editar resposta' : 'Responder'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
