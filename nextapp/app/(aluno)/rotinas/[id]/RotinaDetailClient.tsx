'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, ChevronDown, ChevronUp, Loader2, X, RefreshCw,
  Dumbbell, Clock, Play, Maximize2,
} from 'lucide-react'
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

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)
  return m ? m[1] : null
}

function VideoThumb({ url, nome, size = 'sm' }: { url: string; nome: string; size?: 'sm' | 'lg' }) {
  const [playing, setPlaying] = useState(false)
  const vid = extractYoutubeId(url)
  if (!vid) return null
  if (playing) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlaying(false)}>
        <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPlaying(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X size={24} /></button>
          <div className="aspect-video w-full">
            <iframe src={`https://www.youtube.com/embed/${vid}?autoplay=1`} className="w-full h-full rounded-xl" allowFullScreen allow="autoplay; encrypted-media" title={nome} />
          </div>
        </div>
      </div>
    )
  }
  const dims = size === 'lg' ? 'w-24 h-20' : 'w-16 h-12'
  return (
    <button onClick={() => setPlaying(true)} className={`relative ${dims} rounded-xl overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity`} title={`Ver: ${nome}`}>
      <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={nome} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow">
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

function SessaoCard({ sessao, highlight, alunoId, semanaAtual }: {
  sessao: Sessao
  highlight: boolean
  alunoId: string
  semanaAtual?: number
}) {
  const supabase = createClient()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(highlight)
  const [iniciado, setIniciado] = useState(false)
  const [sessionSecs, setSessionSecs] = useState(0)
  const [restTimer, setRestTimer] = useState<{ itemId: string; secs: number } | null>(null)
  const [restTimerFullscreen, setRestTimerFullscreen] = useState(false)
  const [restTimerPaused, setRestTimerPaused] = useState(false)
  const [progressIdx, setProgressIdx] = useState(0)
  const [substitutoAberto, setSubstitutoAberto] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [pse, setPse] = useState(5)
  const [dor, setDor] = useState(false)
  const [obs, setObs] = useState('')
  const [savingFb, setSavingFb] = useState(false)
  const [isRealizado, setIsRealizado] = useState(sessao.status === 'realizado')
  const [actionError, setActionError] = useState<string | null>(null)

  const itens = sessao.sessao_itens?.sort((a, b) => a.ordem - b.ordem) ?? []

  useEffect(() => {
    if (!iniciado) return
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [iniciado])

  useEffect(() => {
    if (!restTimer || restTimer.secs <= 0 || restTimerPaused) return
    const id = setTimeout(() => setRestTimer(r => r && r.secs > 0 ? { ...r, secs: r.secs - 1 } : null), 1000)
    return () => clearTimeout(id)
  }, [restTimer?.secs, restTimer?.itemId, restTimerPaused])

  function fmt(secs: number) {
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
  }

  function startRestTimer(item: SessaoItem) {
    const idx = itens.findIndex(i => i.id === item.id)
    if (idx !== -1) setProgressIdx(p => Math.max(p, idx + 1))
    setRestTimer({ itemId: item.id, secs: item.descanso_seg ?? 90 })
    setRestTimerFullscreen(true)
    setRestTimerPaused(false)
  }

  function stopRestTimer() {
    setRestTimer(null)
    setRestTimerFullscreen(false)
    setRestTimerPaused(false)
  }

  async function marcarRealizado() {
    setCompleting(true)
    setActionError(null)
    try {
      const { error: err } = await supabase.from('sessoes_treino').update({ status: 'realizado' }).eq('id', sessao.id)
      if (err) throw err
      setIsRealizado(true)
      setFeedbackOpen(true)
    } catch {
      setActionError('Não conseguimos salvar. Tentar de novo?')
    } finally {
      setCompleting(false)
    }
  }

  async function enviarFeedback() {
    setSavingFb(true)
    setActionError(null)
    try {
      const { error: err } = await supabase.from('feedbacks_treino').insert({
        aluno_id: alunoId,
        sessao_id: sessao.id,
        completou: true,
        pse_final: pse,
        sentiu_dor: dor,
        observacoes_livres: obs || null,
      })
      if (err) throw err
      setFeedbackOpen(false)
      setPse(5); setDor(false); setObs('')
      router.refresh()
    } catch {
      setActionError('Não conseguimos enviar o feedback. Tentar de novo?')
    } finally {
      setSavingFb(false)
    }
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${highlight ? 'ring-2 ring-primary shadow-lg' : 'shadow-card'}`}>

      {/* Fullscreen rest timer */}
      {restTimerFullscreen && restTimer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-secondary/95 text-white">
          <button
            onClick={() => setRestTimerFullscreen(false)}
            className="absolute top-6 right-6 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6">Intervalo</p>
          <p className="text-[88px] font-extrabold tabular-nums leading-none">{fmt(restTimer.secs)}</p>
          {restTimer.secs === 0 && (
            <p className="text-green-400 font-bold text-lg mt-3 animate-pulse">Pronto!</p>
          )}
          <div className="flex gap-4 mt-12">
            <button
              onClick={() => setRestTimerPaused(p => !p)}
              className="px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 font-bold text-base transition-colors"
            >
              {restTimerPaused ? 'Retomar' : 'Pausar'}
            </button>
            <button
              onClick={stopRestTimer}
              className="px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 font-bold text-base transition-colors"
            >
              Parar
            </button>
          </div>
        </div>
      )}

      {/* Card header */}
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
            <span>· {itens.length} exercícios</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

          <div className="px-5 pt-4 pb-1">
            {!iniciado ? (
              <button onClick={() => { setIniciado(true); setSessionSecs(0) }} className="btn-primary w-full">
                <Play size={15} />
                {isRealizado ? 'Refazer Treino' : 'Iniciar Treino'}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-lg font-bold text-green-700 tabular-nums">{fmt(sessionSecs)}</span>
                  <span className="text-xs text-green-600">em andamento</span>
                </div>
                <button onClick={() => setIniciado(false)} className="text-xs text-green-500 hover:text-green-700">Pausar</button>
              </div>
            )}
          </div>

          {/* Mini rest timer bar */}
          {restTimer && !restTimerFullscreen && (
            <div className="mx-5 mt-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock size={16} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-orange-600 uppercase tracking-wide font-semibold">Intervalo</p>
                <p className="text-2xl font-bold text-orange-600 tabular-nums leading-none">{fmt(restTimer.secs)}</p>
              </div>
              <button
                onClick={() => setRestTimerFullscreen(true)}
                className="p-1.5 rounded-lg bg-orange-100 text-orange-500 hover:bg-orange-200 transition-colors"
                title="Expandir"
              >
                <Maximize2 size={14} />
              </button>
              <button onClick={stopRestTimer} className="text-xs text-orange-400 hover:text-orange-600 font-medium">Pular</button>
            </div>
          )}

          {/* Exercise progress */}
          {iniciado && itens.length > 0 && (
            <div className="mx-5 mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-outline">
                  {progressIdx === 0 ? `${itens.length} exercícios` : `Exercício ${progressIdx} de ${itens.length}`}
                </span>
                {progressIdx > 0 && (
                  <span className="text-xs text-primary font-bold">{Math.round((progressIdx / itens.length) * 100)}%</span>
                )}
              </div>
              {progressIdx > 0 && (
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(progressIdx / itens.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Exercise list */}
          <div className="p-4 space-y-3">
            {(() => {
              const groups: SessaoItem[][] = []
              const seen = new Set<string>()
              for (const item of itens) {
                if (item.biset_grupo) {
                  if (!seen.has(item.biset_grupo)) {
                    seen.add(item.biset_grupo)
                    groups.push(itens.filter(i => i.biset_grupo === item.biset_grupo))
                  }
                } else {
                  groups.push([item])
                }
              }

              function renderItemRow(item: SessaoItem) {
                const ex = item.exercicio
                const showSubstituto = substitutoAberto === item.id && ex?.substituto
                const videoToShow = showSubstituto ? ex!.substituto! : ex
                const isResting = restTimer?.itemId === item.id

                let semanaData: any = null
                if (item.periodizacao_semanal?.length > 0) {
                  semanaData = semanaAtual
                    ? (item.periodizacao_semanal.find((p: any) => p.semana === semanaAtual) ?? item.periodizacao_semanal[0])
                    : item.periodizacao_semanal[0]
                }
                const series = semanaData?.series ?? item.series
                const repeticoes = semanaData?.repeticoes ?? item.repeticoes
                const carga = semanaData?.carga_kg ?? item.carga_kg
                const intervalo = item.descanso_seg

                return (
                  <div key={item.id} className="flex gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      {showSubstituto && (
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-0.5">Substituto</p>
                      )}
                      <p className="font-bold text-secondary text-base leading-tight">
                        {showSubstituto ? ex!.substituto!.nome : (ex?.nome ?? '–')}
                      </p>

                      <div className="mt-2 space-y-1">
                        {(series || repeticoes) && (
                          <p className="text-sm text-secondary">
                            <span className="font-semibold">Séries:</span>{' '}
                            {series && repeticoes ? `${series}×${repeticoes}` : (series ?? repeticoes)}
                          </p>
                        )}
                        {carga && (
                          <p className="text-sm text-secondary">
                            <span className="font-semibold">Carga:</span> {carga}kg
                          </p>
                        )}
                        {intervalo && (
                          <p className="text-sm text-secondary">
                            <span className="font-semibold">Intervalo:</span> {intervalo}s
                          </p>
                        )}
                      </div>

                      {item.observacoes && (
                        <div className="mt-2.5">
                          <p className="text-sm font-semibold text-secondary">Instruções:</p>
                          <p className="text-sm text-outline mt-0.5 leading-snug">{item.observacoes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {ex?.substituto && (
                          <button
                            onClick={() => setSubstitutoAberto(substitutoAberto === item.id ? null : item.id)}
                            className="flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700 transition-colors"
                          >
                            <RefreshCw size={11} />
                            {substitutoAberto === item.id ? 'Ver original' : 'Substituto'}
                          </button>
                        )}
                        <button
                          onClick={() => startRestTimer(item)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${isResting ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                          <Clock size={11} />
                          {isResting ? fmt(restTimer!.secs) : 'Intervalo'}
                        </button>
                      </div>
                    </div>

                    {videoToShow?.video_url && (
                      <div className="flex-shrink-0">
                        <VideoThumb url={videoToShow.video_url} nome={videoToShow.nome} size="lg" />
                      </div>
                    )}
                  </div>
                )
              }

              return groups.map(group => {
                if (group.length === 1) {
                  const item = group[0]
                  return (
                    <div key={item.id} className={`bg-background rounded-xl overflow-hidden ${restTimer?.itemId === item.id ? 'ring-1 ring-orange-300' : ''}`}>
                      {renderItemRow(item)}
                    </div>
                  )
                }
                return (
                  <div key={`biset-${group[0].biset_grupo}`} className="bg-background rounded-xl overflow-hidden border border-primary/20">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Bi-set</span>
                    </div>
                    {group.map((item, idx) => (
                      <div key={item.id}>
                        {idx > 0 && <div className="mx-4 border-t border-dashed border-outline-variant" />}
                        {renderItemRow(item)}
                      </div>
                    ))}
                  </div>
                )
              })
            })()}
          </div>

          {actionError && (
            <div className="mx-5 mb-3 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold text-xs underline flex-shrink-0">Fechar</button>
            </div>
          )}

          {!isRealizado && !feedbackOpen && (
            <div className="px-5 pb-5">
              <button onClick={marcarRealizado} disabled={completing} className="btn-primary w-full">
                {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {completing ? 'Marcando...' : 'Marcar como Concluído'}
              </button>
            </div>
          )}

          {feedbackOpen && (
            <div className="px-5 pb-5 bg-blue-50 border-t border-blue-100">
              <h4 className="font-bold text-secondary mb-3 mt-3">Como foi o treino?</h4>
              <div className="space-y-3">
                <div>
                  <label className="label">PSE (Percepção de Esforço 1–10)</label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setPse(n)} className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${pse === n ? 'bg-primary-dark text-white' : 'bg-white border border-outline-variant text-secondary hover:border-primary'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dor} onChange={e => setDor(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-secondary">Senti dor ou desconforto</span>
                </label>
                <div>
                  <label className="label">Observações</label>
                  <textarea className="input min-h-[80px]" placeholder="Como se sentiu, o que foi difícil..." value={obs} onChange={e => setObs(e.target.value)} />
                </div>
                <button onClick={enviarFeedback} disabled={savingFb} className="btn-primary w-full">
                  {savingFb ? 'Enviando...' : 'Enviar Feedback'}
                </button>
              </div>
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
  semanaAtual,
}: {
  ciclo: Ciclo
  sessoes: Sessao[]
  alunoId: string
  semanaAtual?: number
}) {
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
          <SessaoCard sessao={treinoHoje} highlight alunoId={alunoId} semanaAtual={semanaAtual} />
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
          <SessaoCard key={s.id} sessao={s} highlight={false} alunoId={alunoId} semanaAtual={semanaAtual} />
        ))
      }
    </div>
  )
}
