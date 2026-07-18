'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, MapPin, Clock, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Bloco = {
  id: string
  ordem: number
  tipo_bloco: string
  duracao_min: number | null
  distancia_km: number | null
  pace_min_km: string | null
  velocidade_kmh: number | null
  zona_fc: string | null
  pse: number | null
  inclinacao_pct: number | null
  observacao_treinador: string | null
}

type Aerobico = {
  id: string
  nome: string
  modalidade: string | null
  objetivo: string | null
  duracao_estimada_min: number | null
  distancia_estimada_km: number | null
  intensidade_principal: string | null
  local_sugerido: string | null
  tags: string[] | null
  status: string
  data_prevista: string | null
  obrigatorio: boolean
  treino_aerobico_blocos: Bloco[]
}

const blocoColors: Record<string, string> = {
  aquecimento: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  principal: 'bg-blue-50 border-blue-200 text-blue-700',
  recuperacao: 'bg-green-50 border-green-200 text-green-700',
  volta_calma: 'bg-purple-50 border-purple-200 text-purple-700',
  observacao_final: 'bg-gray-50 border-gray-200 text-gray-600',
}

const blocoLabel: Record<string, string> = {
  aquecimento: 'Aquecimento',
  principal: 'Principal',
  recuperacao: 'Recuperação',
  volta_calma: 'Volta à Calma',
  observacao_final: 'Observação',
}

export function AerobicosAlunoClient({ alunoId, aerobicos: initial }: { alunoId: string; aerobicos: Aerobico[] }) {
  const supabase = createClient()
  const [aerobicos, setAerobicos] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(initial.find(a => a.status === 'pendente')?.id ?? null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [showFb, setShowFb] = useState<string | null>(null)
  const [pse, setPse] = useState(5)
  const [dor, setDor] = useState(false)
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  const pendentes = aerobicos.filter(a => a.status === 'pendente')
  const concluidos = aerobicos.filter(a => a.status !== 'pendente')

  async function marcar(id: string) {
    setCompleting(id)
    await supabase.from('treinos_aerobicos').update({ status: 'realizado' }).eq('id', id)
    setAerobicos(prev => prev.map(a => a.id === id ? { ...a, status: 'realizado' } : a))
    setShowFb(id)
    setCompleting(null)
  }

  async function enviarFb(id: string) {
    setSaving(true)
    await supabase.from('feedbacks_treino').insert({
      aluno_id: alunoId,
      treino_aerobico_id: id,
      completou: true,
      pse_final: pse,
      sentiu_dor: dor,
      observacoes_livres: obs || null,
    })
    setShowFb(null)
    setPse(5); setDor(false); setObs('')
    setSaving(false)
  }

  function Card({ aerobico }: { aerobico: Aerobico }) {
    const open = expanded === aerobico.id
    const blocos = aerobico.treino_aerobico_blocos?.sort((a, b) => a.ordem - b.ordem) ?? []
    const done = aerobico.status === 'realizado'

    return (
      <div className={`bg-white rounded-xl shadow-card overflow-hidden ${done ? 'opacity-75' : ''}`}>
        <button className="w-full p-5 flex items-start gap-4 text-left" onClick={() => setExpanded(open ? null : aerobico.id)}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-blue-100'}`}>
            <span className="text-xl">{aerobico.modalidade === 'Corrida' ? '🏃' : aerobico.modalidade === 'Bike' ? '🚴' : '🏋️'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-secondary">{aerobico.nome}</p>
              {aerobico.obrigatorio && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Obrigatório</span>}
              {aerobico.tags?.map(t => <span key={t} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t}</span>)}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-outline">
              {aerobico.data_prevista && <span className="flex items-center gap-1"><Clock size={10} />{new Date(aerobico.data_prevista + 'T00:00').toLocaleDateString('pt-BR')}</span>}
              {aerobico.duracao_estimada_min && <span>{aerobico.duracao_estimada_min} min</span>}
              {aerobico.distancia_estimada_km && <span>{aerobico.distancia_estimada_km} km</span>}
              {aerobico.intensidade_principal && <span><Zap size={10} className="inline" /> {aerobico.intensidade_principal}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{done ? 'Concluído' : 'Pendente'}</span>
            {open ? <ChevronUp size={16} className="text-outline" /> : <ChevronDown size={16} className="text-outline" />}
          </div>
        </button>

        {open && (
          <div className="border-t border-outline-variant">
            {aerobico.objetivo && (
              <div className="px-5 py-3 bg-blue-50 text-sm text-primary border-b border-blue-100">
                🎯 {aerobico.objetivo}
              </div>
            )}
            {aerobico.local_sugerido && (
              <div className="px-5 py-2 text-xs text-outline flex items-center gap-1 border-b border-outline-variant">
                <MapPin size={12} /> {aerobico.local_sugerido}
              </div>
            )}

            <div className="p-5 space-y-3">
              {blocos.map(bloco => (
                <div key={bloco.id} className={`border rounded-xl p-4 ${blocoColors[bloco.tipo_bloco] ?? 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">{blocoLabel[bloco.tipo_bloco] ?? bloco.tipo_bloco}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {bloco.duracao_min && <span className="font-semibold">{bloco.duracao_min} min</span>}
                    {bloco.distancia_km && <span>{bloco.distancia_km} km</span>}
                    {bloco.pace_min_km && <span>Pace: {bloco.pace_min_km}/km</span>}
                    {bloco.velocidade_kmh && <span>{bloco.velocidade_kmh} km/h</span>}
                    {bloco.zona_fc && <span>FC: {bloco.zona_fc}</span>}
                    {bloco.pse && <span>PSE: {bloco.pse}/10</span>}
                    {bloco.inclinacao_pct && <span>Incl: {bloco.inclinacao_pct}%</span>}
                  </div>
                  {bloco.observacao_treinador && (
                    <p className="text-xs mt-2 opacity-80">💡 {bloco.observacao_treinador}</p>
                  )}
                </div>
              ))}
            </div>

            {!done && showFb !== aerobico.id && (
              <div className="px-5 pb-5">
                <button onClick={() => marcar(aerobico.id)} disabled={completing === aerobico.id} className="btn-primary w-full">
                  {completing === aerobico.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Marcar como Concluído
                </button>
              </div>
            )}

            {showFb === aerobico.id && (
              <div className="px-5 pb-5 bg-blue-50 border-t border-blue-100">
                <h4 className="font-bold text-secondary mb-3 mt-3">Como foi?</h4>
                <div className="space-y-3">
                  <div>
                    <label className="label">PSE final (1–10)</label>
                    <div className="flex gap-2 mt-1">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} onClick={() => setPse(n)} className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${pse === n ? 'bg-primary-dark text-white' : 'bg-white border border-outline-variant'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={dor} onChange={e => setDor(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-secondary">Senti dor</span>
                  </label>
                  <textarea className="input min-h-[80px]" placeholder="Observações..." value={obs} onChange={e => setObs(e.target.value)} />
                  <button onClick={() => enviarFb(aerobico.id)} disabled={saving} className="btn-primary w-full">
                    {saving ? 'Enviando...' : 'Enviar Feedback'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {pendentes.length > 0 && (
        <div className="mb-8">
          <h2 className="font-extrabold text-secondary mb-4">Aeróbicos Pendentes</h2>
          <div className="space-y-3">{pendentes.map(a => <Card key={a.id} aerobico={a} />)}</div>
        </div>
      )}

      {pendentes.length === 0 && aerobicos.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center mb-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-secondary text-lg">Nenhum aeróbico pendente!</p>
          <p className="text-sm text-outline mt-1">Você está em dia com os treinos aeróbicos.</p>
        </div>
      )}

      {aerobicos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">🏃</p>
          <p className="font-bold text-secondary text-xl">Nenhum treino aeróbico prescrito</p>
          <p className="text-sm text-outline mt-2 max-w-xs leading-relaxed">
            Quando seu treinador prescrever sessões aeróbicas, elas aparecerão aqui.
          </p>
        </div>
      )}

      {concluidos.length > 0 && (
        <div>
          <h2 className="font-extrabold text-secondary mb-4">Concluídos</h2>
          <div className="space-y-3">{concluidos.map(a => <Card key={a.id} aerobico={a} />)}</div>
        </div>
      )}
    </div>
  )
}
