'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Clock, Maximize2, X, RefreshCw,
  CheckCircle2, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ExercicioBase = {
  id: string
  nome: string
  grupo_muscular: string
  video_url: string | null
  instrucoes: string | null
}

type ExercicioComSubstituto = ExercicioBase & {
  exercicio_substituto_id: string | null
  substituto: ExercicioBase | null
}

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
  exercicio: ExercicioComSubstituto | null
}

type Sessao = {
  id: string
  nome: string
  tipo: string
  dia_letra: string | null
  status: string
  duracao_min: number | null
  intensidade: string | null
  observacoes: string | null
  orientacoes_aluno: string | null
  ciclo_id: string | null
  sessao_itens: SessaoItem[]
}

type Ciclo = {
  id: string
  nome: string
  data_inicio: string | null
  data_fim: string | null
} | null

const MC_FASES = [
  'Adaptação Técnica','Consolidação','Progressão','Estabilidade','Volume',
  'Intensidade','Expansão','Força','Performance','Refinamento','Recuperação Ativa','Fechamento',
]

function calcSemana(dataInicio: string | null): number | null {
  if (!dataInicio) return null
  const inicio = new Date(dataInicio + 'T00:00')
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / 86400000)
  if (dias < 0) return null
  return Math.floor(dias / 7) + 1
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)
  return m ? m[1] : null
}

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

function VideoThumb({ url, nome }: { url: string; nome: string }) {
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
  return (
    <button onClick={() => setPlaying(true)} className="relative w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity" title={`Ver: ${nome}`}>
      <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={nome} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow">
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

export function ExecucaoClient({ alunoId, sessao, ciclo }: { alunoId: string; sessao: Sessao; ciclo: Ciclo }) {
  const router = useRouter()
  const supabase = createClient()

  const itens = [...(sessao.sessao_itens ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const semana = ciclo ? calcSemana(ciclo.data_inicio) : null
  const faseNome = semana ? MC_FASES[(semana - 1) % MC_FASES.length] : null

  const [sessionSecs, setSessionSecs] = useState(0)
  const [restTimer, setRestTimer] = useState<{ itemId: string; secs: number } | null>(null)
  const [restTimerFullscreen, setRestTimerFullscreen] = useState(false)
  const [restTimerPaused, setRestTimerPaused] = useState(false)
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set())
  const [substitutoAberto, setSubstitutoAberto] = useState<string | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)

  // Feedback/complete state
  const [completing, setCompleting] = useState(false)
  const [feedbackStep, setFeedbackStep] = useState(false)
  const [pse, setPse] = useState(5)
  const [dor, setDor] = useState(false)
  const [obs, setObs] = useState('')
  const [savingFb, setSavingFb] = useState(false)

  // Auto-start session timer
  useEffect(() => {
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer || restTimer.secs <= 0 || restTimerPaused) return
    const id = setTimeout(() => setRestTimer(r => r && r.secs > 0 ? { ...r, secs: r.secs - 1 } : null), 1000)
    return () => clearTimeout(id)
  }, [restTimer?.secs, restTimer?.itemId, restTimerPaused])

  function startRestTimer(item: SessaoItem) {
    setCompletedItemIds(prev => new Set([...prev, item.id]))
    setRestTimer({ itemId: item.id, secs: item.descanso_seg ?? 90 })
    setRestTimerFullscreen(true)
    setRestTimerPaused(false)
  }

  function stopRestTimer() {
    setRestTimer(null)
    setRestTimerFullscreen(false)
    setRestTimerPaused(false)
  }

  async function marcarConcluido() {
    setCompleting(true)
    await supabase.from('sessoes_treino').update({ status: 'realizado' } as any).eq('id', sessao.id)
    setCompleting(false)
    setFeedbackStep(true)
  }

  async function enviarFeedback() {
    setSavingFb(true)
    await supabase.from('feedbacks_treino').insert({
      aluno_id: alunoId,
      sessao_id: sessao.id,
      completou: true,
      pse_final: pse,
      sentiu_dor: dor,
      observacoes_livres: obs || null,
    } as any)
    setSavingFb(false)
    router.push('/treino')
    router.refresh()
  }

  const pct = itens.length > 0 ? Math.round((completedItemIds.size / itens.length) * 100) : 0
  const isRealizado = sessao.status === 'realizado'

  // ── Groups (biset) ─────────────────────────────────────────────────────────
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

  function renderItem(item: SessaoItem) {
    const ex = item.exercicio
    const showSub = substitutoAberto === item.id && ex?.substituto
    const videoEx = showSub ? ex!.substituto! : ex
    const isResting = restTimer?.itemId === item.id

    const series = semana
      ? (item.periodizacao_semanal?.find((p: any) => p.semana === semana) ?? item.periodizacao_semanal?.[0])?.series ?? item.series
      : item.series
    const repeticoes = semana
      ? (item.periodizacao_semanal?.find((p: any) => p.semana === semana) ?? item.periodizacao_semanal?.[0])?.repeticoes ?? item.repeticoes
      : item.repeticoes
    const carga = semana
      ? (item.periodizacao_semanal?.find((p: any) => p.semana === semana) ?? item.periodizacao_semanal?.[0])?.carga_kg ?? item.carga_kg
      : item.carga_kg

    return (
      <div key={item.id} className="flex gap-3 p-4">
        <div className="flex-1 min-w-0">
          {showSub && <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-0.5">Substituto</p>}
          <p className="font-bold text-secondary text-base leading-tight">
            {showSub ? ex!.substituto!.nome : (ex?.nome ?? '–')}
          </p>
          <div className="mt-2 space-y-1">
            {(series || repeticoes) && (
              <p className="text-sm text-secondary">
                <span className="font-semibold">Séries:</span>{' '}
                {series && repeticoes ? `${series}×${repeticoes}` : (series ?? repeticoes)}
              </p>
            )}
            {carga && <p className="text-sm text-secondary"><span className="font-semibold">Carga:</span> {carga}kg</p>}
            {item.descanso_seg && <p className="text-sm text-secondary"><span className="font-semibold">Intervalo:</span> {item.descanso_seg}s</p>}
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
                className="flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700"
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
        {videoEx?.video_url && <VideoThumb url={videoEx.video_url} nome={videoEx.nome} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-background min-h-screen">

      {/* Fullscreen rest timer */}
      {restTimerFullscreen && restTimer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-secondary/95 text-white">
          <button onClick={() => setRestTimerFullscreen(false)} className="absolute top-6 right-6 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10">
            <X size={24} />
          </button>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6">Intervalo</p>
          <p className="text-[80px] font-extrabold tabular-nums leading-none">{fmt(restTimer.secs)}</p>
          {restTimer.secs === 0 && <p className="text-green-400 font-bold text-lg mt-3 animate-pulse">Pronto!</p>}
          <div className="flex gap-4 mt-12">
            <button onClick={() => setRestTimerPaused(p => !p)} className="px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 font-bold">
              {restTimerPaused ? 'Retomar' : 'Pausar'}
            </button>
            <button onClick={stopRestTimer} className="px-8 py-4 rounded-2xl bg-white/15 hover:bg-white/25 font-bold">Pular</button>
          </div>
        </div>
      )}

      {/* Exit modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant text-center">
              <p className="font-bold text-secondary">Sair do treino?</p>
              <p className="text-sm text-outline mt-1">O progresso desta sessão não será salvo.</p>
            </div>
            <div className="p-3 space-y-2">
              <button onClick={() => router.back()} className="w-full py-3 px-4 rounded-xl bg-secondary text-white font-semibold text-sm">
                Sair
              </button>
              <button onClick={() => setShowExitModal(false)} className="w-full py-3 px-4 rounded-xl bg-gray-100 text-secondary font-semibold text-sm">
                Continuar treinando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 max-w-2xl mx-auto">
          <button onClick={() => setShowExitModal(true)} className="p-2 -ml-1 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft size={22} className="text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-secondary text-sm truncate">{sessao.nome}</p>
            <p className="text-[11px] text-outline truncate">
              {faseNome && `${faseNome} · `}{itens.length} exercício{itens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 text-right">
            <div>
              <p className="text-base font-bold text-green-700 tabular-nums leading-none">{fmt(sessionSecs)}</p>
              <p className="text-[10px] text-green-600">em andamento</p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-[10px] text-outline mb-1.5">
            <span>{completedItemIds.size} de {itens.length} concluídos</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-24 space-y-4 pt-4">

        {/* Orientações */}
        {(sessao.observacoes || sessao.orientacoes_aluno) && (
          <div className="bg-blue-50 px-4 py-3 rounded-xl text-sm text-primary">
            📋 {sessao.orientacoes_aluno || sessao.observacoes}
          </div>
        )}

        {/* Mini rest timer */}
        {restTimer && !restTimerFullscreen && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-orange-600 uppercase tracking-wide font-semibold">Intervalo</p>
              <p className="text-2xl font-bold text-orange-600 tabular-nums leading-none">{fmt(restTimer.secs)}</p>
            </div>
            <button onClick={() => setRestTimerFullscreen(true)} className="p-1.5 rounded-lg bg-orange-100 text-orange-500 hover:bg-orange-200">
              <Maximize2 size={14} />
            </button>
            <button onClick={stopRestTimer} className="text-xs text-orange-400 hover:text-orange-600 font-medium">Pular</button>
          </div>
        )}

        {/* Exercise list */}
        <div className="space-y-3">
          {groups.map((group) => {
            if (group.length === 1) {
              const item = group[0]
              const isResting = restTimer?.itemId === item.id
              return (
                <div key={item.id} className={`bg-white rounded-2xl overflow-hidden shadow-card ${isResting ? 'ring-1 ring-orange-300' : ''}`}>
                  {renderItem(item)}
                </div>
              )
            }
            return (
              <div key={`biset-${group[0].biset_grupo}`} className="bg-white rounded-2xl overflow-hidden shadow-card border border-primary/20">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Bi-set</span>
                </div>
                {group.map((item, idx) => (
                  <div key={item.id}>
                    {idx > 0 && <div className="mx-4 border-t border-dashed border-outline-variant" />}
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Complete & Feedback */}
        {!feedbackStep && !isRealizado && (
          <button onClick={marcarConcluido} disabled={completing} className="btn-primary w-full mt-2">
            {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {completing ? 'Marcando...' : 'Marcar como Concluído'}
          </button>
        )}

        {feedbackStep && (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
            <h4 className="font-bold text-secondary text-lg">Como foi o treino?</h4>
            <div>
              <label className="label">PSE — Percepção de Esforço (1–10)</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setPse(n)} className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${pse === n ? 'bg-primary text-white' : 'bg-gray-100 text-secondary hover:bg-gray-200'}`}>{n}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={dor} onChange={e => setDor(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-secondary">Senti dor ou desconforto</span>
            </label>
            <div>
              <label className="label">Observações (opcional)</label>
              <textarea className="input min-h-[80px] mt-1" placeholder="Como se sentiu, o que foi difícil..." value={obs} onChange={e => setObs(e.target.value)} />
            </div>
            <button onClick={enviarFeedback} disabled={savingFb} className="btn-primary w-full">
              {savingFb ? 'Enviando...' : 'Enviar feedback e voltar'}
            </button>
          </div>
        )}

        {isRealizado && !feedbackStep && (
          <div className="text-center py-6 text-green-600">
            <CheckCircle2 size={36} className="mx-auto mb-2" />
            <p className="font-bold">Treino já concluído!</p>
            <button onClick={() => router.back()} className="mt-3 text-sm text-outline hover:text-secondary underline">Voltar</button>
          </div>
        )}
      </div>
    </div>
  )
}
