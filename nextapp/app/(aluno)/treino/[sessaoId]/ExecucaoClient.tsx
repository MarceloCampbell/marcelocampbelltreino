'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Clock, Maximize2, X, RefreshCw,
  CheckCircle2, Loader2, Share2, Dumbbell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
type ExercicioBase = { id: string; nome: string; grupo_muscular: string; video_url: string | null; instrucoes: string | null }
type ExercicioComSub = ExercicioBase & { exercicio_substituto_id: string | null; substituto: ExercicioBase | null }
type SessaoItem = {
  id: string; ordem: number; series: number | null; repeticoes: string | null
  carga_kg: number | null; descanso_seg: number | null; observacoes: string | null
  periodizacao_semanal: any; biset_grupo: string | null; exercicio: ExercicioComSub | null
}
type Sessao = {
  id: string; nome: string; tipo: string; dia_letra: string | null; status: string
  duracao_min: number | null; intensidade: string | null; observacoes: string | null
  orientacoes_aluno: string | null; ciclo_id: string | null; sessao_itens: SessaoItem[]
}
type Ciclo = { id: string; nome: string; data_inicio: string | null; data_fim: string | null } | null
type FeedbackForm = {
  energia: number; progressoCarga: string; exercicioDificil: string; melhorMomento: string
  sentiu_dor: boolean; descricao_dor: string; obstaculos: string; pergunta: string; pesoAtual: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const MC_FASES = [
  'Adaptação Técnica','Consolidação','Progressão','Estabilidade','Volume',
  'Intensidade','Expansão','Força','Performance','Refinamento','Recuperação Ativa','Fechamento',
]

// ── Utils ──────────────────────────────────────────────────────────────────────
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

// ── VideoThumb — full-width, neutral play icon ─────────────────────────────────
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
    <button onClick={() => setPlaying(true)} className="relative w-full aspect-video rounded-xl overflow-hidden block hover:opacity-95 transition-opacity" title={`Ver: ${nome}`}>
      <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={nome} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <div className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[18px] border-t-transparent border-b-transparent border-l-white ml-1" />
        </div>
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ExecucaoClient({ alunoId, sessao, ciclo }: { alunoId: string; sessao: Sessao; ciclo: Ciclo }) {
  const router = useRouter()
  const supabase = createClient()
  const shareCanvasRef = useRef<HTMLCanvasElement>(null)

  const itens = [...(sessao.sessao_itens ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const semana = ciclo ? calcSemana(ciclo.data_inicio) : null
  const faseNome = semana ? MC_FASES[(semana - 1) % MC_FASES.length] : null
  const rotinaName = ciclo?.nome ?? null

  // ── Timer ──────────────────────────────────────────────────────────────────
  const [sessionSecs, setSessionSecs] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // ── Rest timer ─────────────────────────────────────────────────────────────
  const [restTimer, setRestTimer] = useState<{ itemId: string; secs: number } | null>(null)
  const [restTimerFullscreen, setRestTimerFullscreen] = useState(false)
  const [restTimerPaused, setRestTimerPaused] = useState(false)

  // ── Exercise state ─────────────────────────────────────────────────────────
  const [exercisesDone, setExercisesDone] = useState<Set<string>>(new Set())
  const [seriesDone, setSeriesDone] = useState<Record<string, Set<number>>>({})
  const [cargaRegistrada, setCargaRegistrada] = useState<Record<string, string>>({})
  const [substitutoAberto, setSubstitutoAberto] = useState<string | null>(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showExitModal, setShowExitModal] = useState(false)
  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null)

  // ── Completion flow ────────────────────────────────────────────────────────
  const [completing, setCompleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false)
  const [incompleteReasons, setIncompleteReasons] = useState<Record<string, string>>({})
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isRealizado, setIsRealizado] = useState(sessao.status === 'realizado')
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    energia: 5, progressoCarga: '', exercicioDificil: '', melhorMomento: '',
    sentiu_dor: false, descricao_dor: '', obstaculos: '', pergunta: '', pesoAtual: '',
  })
  const [savingFeedback, setSavingFeedback] = useState(false)

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) return
    const id = setInterval(() => setSessionSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [isPaused])

  useEffect(() => {
    if (!restTimer || restTimer.secs <= 0 || restTimerPaused) return
    const id = setTimeout(() => setRestTimer(r => r && r.secs > 0 ? { ...r, secs: r.secs - 1 } : null), 1000)
    return () => clearTimeout(id)
  }, [restTimer?.secs, restTimer?.itemId, restTimerPaused]) // eslint-disable-line

  useEffect(() => {
    supabase.from('workout_sessions').insert({
      aluno_id: alunoId, sessao_id: sessao.id,
      iniciado_em: new Date().toISOString(), status: 'em_andamento',
    } as any).select('id').single().then(({ data }) => { if (data) setWorkoutSessionId((data as any).id) })
  }, []) // eslint-disable-line

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function startRestTimer(item: SessaoItem) {
    const idx = itens.findIndex(i => i.id === item.id)
    if (idx !== -1) {
      const nextVid = extractYoutubeId(itens[idx + 1]?.exercicio?.video_url ?? null)
      if (nextVid) {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = `https://img.youtube.com/vi/${nextVid}/hqdefault.jpg`
        document.head.appendChild(link)
      }
    }
    setRestTimer({ itemId: item.id, secs: item.descanso_seg ?? 90 })
    setRestTimerFullscreen(true)
    setRestTimerPaused(false)
  }

  function stopRestTimer() { setRestTimer(null); setRestTimerFullscreen(false); setRestTimerPaused(false) }

  function toggleExerciseDone(itemId: string, totalSeries?: number) {
    setExercisesDone(prev => {
      const s = new Set(prev)
      const nowDone = !s.has(itemId)
      nowDone ? s.add(itemId) : s.delete(itemId)
      if (totalSeries) {
        setSeriesDone(sd => ({
          ...sd,
          [itemId]: nowDone ? new Set(Array.from({ length: totalSeries }, (_, i) => i + 1)) : new Set(),
        }))
      }
      return s
    })
  }

  function toggleSerie(itemId: string, serieNum: number, totalSeries: number) {
    setSeriesDone(prev => {
      const current = new Set(prev[itemId] ?? [])
      current.has(serieNum) ? current.delete(serieNum) : current.add(serieNum)
      const allDone = current.size === totalSeries
      setExercisesDone(ed => { const s = new Set(ed); allDone ? s.add(itemId) : s.delete(itemId); return s })
      return { ...prev, [itemId]: current }
    })
  }

  function calcVolume() {
    return itens.reduce((total, item) => {
      if (!exercisesDone.has(item.id)) return total
      const carga = parseFloat(cargaRegistrada[item.id] || '0') || (item.carga_kg ?? 0)
      const reps = parseInt(item.repeticoes ?? '0') || 0
      return total + carga * reps * (item.series ?? 0)
    }, 0)
  }

  async function marcarRealizado() {
    const incomplete = itens.filter(i => !exercisesDone.has(i.id))
    if (incomplete.length > 0) { setShowIncompleteDialog(true); return }
    await finalizarTreino()
  }

  async function finalizarTreino() {
    setCompleting(true); setActionError(null); setIsPaused(true)
    try {
      const { error } = await supabase.from('sessoes_treino').update({ status: 'realizado' } as any).eq('id', sessao.id)
      if (error) throw error
      setIsRealizado(true)
      const incomplete = itens.filter(i => !exercisesDone.has(i.id))
      if (workoutSessionId) {
        await supabase.from('workout_sessions').update({
          concluido_em: new Date().toISOString(),
          status: incomplete.length > 0 ? 'incompleto' : 'concluido',
          motivo_incompleto: incomplete.length > 0
            ? incomplete.map(i => `${i.exercicio?.nome ?? '?'}: ${incompleteReasons[i.id] || 'Não informado'}`).join('; ')
            : null,
        } as any).eq('id', workoutSessionId)
        for (const item of itens) {
          if (!exercisesDone.has(item.id)) continue
          const carga = parseFloat(cargaRegistrada[item.id] || '0') || null
          const series = item.series ?? 0
          if (series > 0) {
            await supabase.from('set_executions').insert(
              Array.from({ length: series }, (_, idx) => ({
                session_id: workoutSessionId, sessao_item_id: item.id,
                numero_serie: idx + 1, carga_registrada: carga, concluida: true,
              })) as any
            )
          }
        }
      }
      setShowIncompleteDialog(false); setShowFeedbackForm(true)
    } catch {
      setActionError('Não conseguimos salvar. Tente novamente.'); setIsPaused(false)
    } finally {
      setCompleting(false)
    }
  }

  async function enviarFeedback() {
    setSavingFeedback(true); setActionError(null)
    try {
      const incompleteList = itens.filter(i => !exercisesDone.has(i.id))
        .map(i => ({ nome: i.exercicio?.nome ?? '?', motivo: incompleteReasons[i.id] || 'Não informado' }))
      await supabase.from('workout_feedbacks').insert({
        aluno_id: alunoId, sessao_id: sessao.id, workout_session_id: workoutSessionId,
        energia_nivel: feedbackForm.energia, progresso_carga: feedbackForm.progressoCarga || null,
        exercicio_mais_dificil: feedbackForm.exercicioDificil || null,
        melhor_momento: feedbackForm.melhorMomento || null,
        sentiu_dor: feedbackForm.sentiu_dor, descricao_dor: feedbackForm.descricao_dor || null,
        obstaculos: feedbackForm.obstaculos || null, pergunta_marcelo: feedbackForm.pergunta || null,
        peso_atual: feedbackForm.pesoAtual ? parseFloat(feedbackForm.pesoAtual) : null,
        exercicios_incompletos: incompleteList.length > 0 ? incompleteList : null,
      } as any)
      setShowFeedbackForm(false); setShowCelebration(true)
    } catch { setActionError('Não foi possível salvar o feedback.') }
    finally { setSavingFeedback(false) }
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  function drawShareCard(canvas: HTMLCanvasElement) {
    const W = 540, H = 960
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#1E6FD9'; ctx.fillRect(0, 0, W, 6)
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'; ctx.fillStyle = '#4A90D9'; ctx.textAlign = 'center'
    ctx.fillText('MC TREINO', W / 2, 60); ctx.shadowBlur = 0
    ctx.beginPath(); ctx.arc(W / 2, 155, 52, 0, Math.PI * 2)
    ctx.fillStyle = '#14532D'; ctx.fill()
    ctx.strokeStyle = '#22C55E'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(W/2-20,155); ctx.lineTo(W/2-4,172); ctx.lineTo(W/2+22,138); ctx.stroke()
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 12
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.fillText('Treino Concluído!', W/2, 248); ctx.shadowBlur = 0
    const hoje = new Date()
    ctx.fillStyle = '#CBD5E1'; ctx.font = '19px system-ui, -apple-system, sans-serif'
    ctx.fillText(hoje.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }), W/2, 285)
    const dayLetters = ['S','T','Q','Q','S','S','D']; const jsDay = hoje.getDay()
    const activeIdx = jsDay === 0 ? 6 : jsDay - 1
    const startX = (W - dayLetters.length * 52) / 2 + 26
    dayLetters.forEach((d, i) => {
      const x = startX + i * 52
      ctx.beginPath(); ctx.arc(x, 348, 20, 0, Math.PI * 2)
      ctx.fillStyle = i === activeIdx ? '#1E6FD9' : '#1E2D45'; ctx.fill()
      ctx.fillStyle = i === activeIdx ? '#FFFFFF' : '#475569'
      ctx.font = `${i === activeIdx ? 'bold ' : ''}14px system-ui, -apple-system, sans-serif`
      ctx.fillText(d, x, 354)
    })
    ctx.strokeStyle = '#1E2D45'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(60, 395); ctx.lineTo(W-60, 395); ctx.stroke()
    if (rotinaName) {
      ctx.fillStyle = '#475569'; ctx.font = '16px system-ui, -apple-system, sans-serif'
      ctx.fillText(rotinaName, W/2, 430)
    }
    const treinoLabel = (sessao.dia_letra ? `${sessao.dia_letra} – ` : '') + sessao.nome
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 26px system-ui, -apple-system, sans-serif'
    ctx.fillText(treinoLabel.length > 28 ? treinoLabel.slice(0,28)+'…' : treinoLabel, W/2, rotinaName ? 468 : 445)
    ctx.shadowBlur = 0
    const grupos = [...new Set(itens.filter(i => exercisesDone.has(i.id)).map(i => i.exercicio?.grupo_muscular).filter(Boolean))] as string[]
    if (grupos.length > 0) {
      const gt = grupos.join(' · ').toUpperCase()
      ctx.fillStyle = '#4A90D9'; ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      ctx.fillText(gt.length > 45 ? gt.slice(0,45)+'…' : gt, W/2, rotinaName ? 500 : 477)
    }
    const statsY = 570
    ctx.fillStyle = 'rgba(15,30,50,0.82)'; (ctx as any).roundRect(40, statsY-30, W-80, 80, 16); ctx.fill()
    const stats = [{ label:'DURAÇÃO', value: fmt(sessionSecs) }, { label:'EXERCÍCIOS', value:`${exercisesDone.size}/${itens.length}` }, { label:'VOLUME', value:`${calcVolume().toFixed(0)}kg` }]
    stats.forEach((s, i) => {
      const x = 40 + (W-80)/6 + i*(W-80)/3
      ctx.fillStyle = '#4A90D9'; ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'; ctx.fillText(s.value, x, statsY+10)
      ctx.fillStyle = '#475569'; ctx.font = '11px system-ui, -apple-system, sans-serif'; ctx.fillText(s.label, x, statsY+28)
    })
    ctx.fillStyle = 'rgba(6,14,26,0.88)'; ctx.fillRect(0, H-70, W, 70)
    ctx.fillStyle = '#1E6FD9'; ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'; ctx.fillText('mc-treino.app', W/2, H-38)
    ctx.fillStyle = '#2A3F5A'; ctx.font = '12px system-ui, -apple-system, sans-serif'; ctx.fillText('Registre. Evolua. Compartilhe.', W/2, H-16)
  }

  async function handleShare() {
    const canvas = shareCanvasRef.current; if (!canvas) return
    drawShareCard(canvas)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'meu-treino.png', { type:'image/png' })
      try {
        if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title:'Treino Concluído!', text:`Concluí "${sessao.nome}" no MC Treino!` })
        } else if (typeof navigator.share === 'function') {
          await navigator.share({ title:'Treino Concluído!', text:`Concluí "${sessao.nome}" no MC Treino!` })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'meu-treino.png'; a.click()
          URL.revokeObjectURL(url)
        }
      } catch { /* cancelled */ }
    }, 'image/png')
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const pct = itens.length > 0 ? Math.round((exercisesDone.size / itens.length) * 100) : 0

  const groups: SessaoItem[][] = []
  const seenGroups = new Set<string>()
  for (const item of itens) {
    if (item.biset_grupo) {
      if (!seenGroups.has(item.biset_grupo)) {
        seenGroups.add(item.biset_grupo)
        groups.push(itens.filter(i => i.biset_grupo === item.biset_grupo))
      }
    } else { groups.push([item]) }
  }

  function renderItem(item: SessaoItem) {
    const ex = item.exercicio
    const showSub = substitutoAberto === item.id && ex?.substituto
    const videoEx = showSub ? ex!.substituto! : ex
    const isResting = restTimer?.itemId === item.id
    const isDone = exercisesDone.has(item.id)

    const semData = semana && item.periodizacao_semanal?.length > 0
      ? (item.periodizacao_semanal.find((p: any) => p.semana === semana) ?? item.periodizacao_semanal[0])
      : null
    const series = semData?.series ?? item.series
    const repeticoes = semData?.repeticoes ?? item.repeticoes
    const carga = semData?.carga_kg ?? item.carga_kg

    return (
      <div key={item.id} className={`p-4 transition-colors ${isDone ? 'bg-green-50/60' : ''}`}>

        {/* 1. Nome + Substituto inline */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {showSub && <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">Substituto:</span>}
          <p className="font-bold text-secondary text-lg leading-tight">
            {showSub ? ex!.substituto!.nome : (ex?.nome ?? '–')}
          </p>
          {ex?.substituto && (
            <button
              onClick={() => setSubstitutoAberto(substitutoAberto === item.id ? null : item.id)}
              className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:text-orange-700"
            >
              <RefreshCw size={11} />
              {substitutoAberto === item.id ? 'Original' : 'Substituto'}
            </button>
          )}
        </div>

        {/* 2. Vídeo full-width */}
        {videoEx?.video_url && (
          <div className="mb-3">
            <VideoThumb url={videoEx.video_url} nome={videoEx.nome} />
          </div>
        )}

        {/* 3. Séries + bolinhas */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {(series || repeticoes) && (
            <p className="text-sm font-semibold text-secondary">
              Séries: {series && repeticoes ? `${series}×${repeticoes}` : (series ?? repeticoes)}
            </p>
          )}
          {(series ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: series as number }).map((_, i) => {
                const sNum = i + 1
                const checked = seriesDone[item.id]?.has(sNum) ?? false
                return (
                  <button
                    key={sNum}
                    onClick={() => toggleSerie(item.id, sNum, series as number)}
                    className={`w-8 h-8 rounded-full border-2 text-sm font-bold flex items-center justify-center transition-all ${
                      checked ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-green-400 hover:text-green-500'
                    }`}
                  >
                    {checked ? '✓' : sNum}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. Marcar como feito */}
        <button
          onClick={() => toggleExerciseDone(item.id, series ?? undefined)}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors mb-3 ${isDone ? 'text-green-600' : 'text-outline hover:text-green-600'}`}
        >
          <CheckCircle2 size={18} className={isDone ? 'fill-green-100' : ''} />
          {isDone ? 'Exercício concluído' : 'Marcar como feito'}
        </button>

        {/* 5. Intervalo */}
        {item.descanso_seg && (
          <button
            onClick={() => startRestTimer(item)}
            className={`flex items-center gap-1.5 text-sm font-semibold mb-3 transition-colors ${isResting ? 'text-orange-500' : 'text-secondary hover:text-primary'}`}
          >
            <Clock size={14} className="flex-shrink-0" />
            {isResting ? `Intervalo: ${fmt(restTimer!.secs)}` : `Intervalo: ${item.descanso_seg}s`}
          </button>
        )}

        {/* 6. Carga editável */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-secondary">Carga:</span>
          <input
            type="text"
            inputMode="decimal"
            className="w-32 border border-outline-variant rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-primary"
            placeholder={carga ? String(carga) : 'ex: 40/45/50'}
            value={cargaRegistrada[item.id] ?? ''}
            onChange={e => setCargaRegistrada(prev => ({ ...prev, [item.id]: e.target.value }))}
          />
        </div>

        {/* 7. Instruções */}
        {item.observacoes && (
          <div>
            <p className="text-sm font-semibold text-secondary mb-0.5">Instruções:</p>
            <p className="text-sm text-outline leading-snug">{item.observacoes}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
              <p className="text-sm text-outline mt-1">O treino está em andamento.</p>
            </div>
            <div className="p-3 space-y-2">
              <button onClick={() => { setIsPaused(true); setShowExitModal(false); router.back() }} className="w-full py-3 px-4 rounded-xl bg-secondary text-white font-semibold text-sm">
                Sair e pausar
              </button>
              <button onClick={() => { setShowExitModal(false); router.back() }} className="w-full py-3 px-4 rounded-xl bg-gray-100 text-secondary font-semibold text-sm">
                Sair sem pausar
              </button>
              <button onClick={() => setShowExitModal(false)} className="w-full py-3 px-4 rounded-xl text-outline text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 max-w-2xl mx-auto">
          <button onClick={() => setShowExitModal(true)} className="p-2 -ml-1 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft size={22} className="text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-secondary text-sm truncate">{sessao.nome}</p>
            <p className="text-[11px] text-outline truncate">
              {faseNome ? `${faseNome} · ` : ''}{itens.length} exercício{itens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className={`text-base font-bold tabular-nums leading-none ${isPaused ? 'text-outline' : 'text-green-700'}`}>{fmt(sessionSecs)}</p>
            <p className="text-[10px] text-green-600">{isPaused ? 'pausado' : 'em andamento'}</p>
          </div>
        </div>
        <div className="px-4 pb-3 max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-[10px] text-outline mb-1.5">
            <span>{exercisesDone.size} de {itens.length} concluídos</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 pb-24 pt-4 space-y-4">

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
          {groups.map(group => {
            if (group.length === 1) {
              const item = group[0]
              return (
                <div key={item.id} className={`bg-white rounded-2xl overflow-hidden shadow-card ${restTimer?.itemId === item.id ? 'ring-1 ring-orange-300' : ''}`}>
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

        {/* Error */}
        {actionError && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-500 underline text-xs flex-shrink-0">Fechar</button>
          </div>
        )}

        {/* Incomplete dialog */}
        {showIncompleteDialog && (() => {
          const incomplete = itens.filter(i => !exercisesDone.has(i.id))
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <p className="font-bold text-secondary mb-1">Exercícios sem conclusão ({incomplete.length})</p>
              <p className="text-sm text-outline mb-4">Selecione o motivo para cada um:</p>
              <div className="space-y-5 max-h-64 overflow-y-auto pr-1">
                {incomplete.map(item => (
                  <div key={item.id}>
                    <p className="text-sm font-semibold text-secondary mb-2">{item.exercicio?.nome ?? 'Exercício'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Máquina ocupada','Dor ou desconforto','Falta de tempo','Outro'].map(m => (
                        <button key={m} onClick={() => setIncompleteReasons(prev => ({ ...prev, [item.id]: m }))}
                          className={`text-xs font-semibold py-2 px-2 rounded-xl border transition-all ${incompleteReasons[item.id] === m ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-outline-variant hover:border-primary'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={finalizarTreino} disabled={completing} className="btn-primary flex-1">
                  {completing ? <Loader2 size={14} className="animate-spin" /> : null}
                  Concluir assim mesmo
                </button>
                <button onClick={() => setShowIncompleteDialog(false)} className="btn-ghost text-sm">Cancelar</button>
              </div>
            </div>
          )
        })()}

        {/* Finalize button */}
        {!isRealizado && !showIncompleteDialog && !showFeedbackForm && !showCelebration && (
          <button onClick={marcarRealizado} disabled={completing} className="btn-primary w-full">
            {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {completing ? 'Salvando...' : 'Finalizar Treino'}
          </button>
        )}

        {/* Feedback form */}
        {showFeedbackForm && (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-5">
            <div className="text-center pb-2 border-b border-outline-variant">
              <p className="text-3xl mb-1">🏆</p>
              <p className="font-extrabold text-secondary text-lg">Treino concluído!</p>
              <p className="text-sm text-outline mt-1">{fmt(sessionSecs)} · {exercisesDone.size}/{itens.length} exercícios · {calcVolume().toFixed(0)} kg volume</p>
            </div>
            <h4 className="font-bold text-secondary">Como foi o treino?</h4>

            <div>
              <label className="label">Nível de energia (1–10)</label>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setFeedbackForm(p => ({ ...p, energia: n }))}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${feedbackForm.energia === n ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary hover:border-primary'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Progredi nas cargas esta semana?</label>
              <div className="flex gap-2 mt-1">
                {[{v:'sim',l:'Sim'},{v:'nao',l:'Não'},{v:'em_alguns',l:'Em alguns'}].map(({v,l}) => (
                  <button key={v} onClick={() => setFeedbackForm(p => ({ ...p, progressoCarga: v }))}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${feedbackForm.progressoCarga === v ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-outline-variant hover:border-primary'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Exercício mais difícil</label>
              <input className="input mt-1" placeholder="Nome do exercício..." value={feedbackForm.exercicioDificil} onChange={e => setFeedbackForm(p => ({ ...p, exercicioDificil: e.target.value }))} />
            </div>
            <div>
              <label className="label">Melhor momento do treino</label>
              <input className="input mt-1" placeholder="O que te surpreendeu positivamente?" value={feedbackForm.melhorMomento} onChange={e => setFeedbackForm(p => ({ ...p, melhorMomento: e.target.value }))} />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={feedbackForm.sentiu_dor} onChange={e => setFeedbackForm(p => ({ ...p, sentiu_dor: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-secondary font-medium">Senti dor ou desconforto</span>
              </label>
              {feedbackForm.sentiu_dor && (
                <input className="input mt-2" placeholder="Onde? Quando no treino?" value={feedbackForm.descricao_dor} onChange={e => setFeedbackForm(p => ({ ...p, descricao_dor: e.target.value }))} />
              )}
            </div>
            <div>
              <label className="label">Obstáculos encontrados</label>
              <input className="input mt-1" placeholder="Fila, máquina ocupada, tempo curto..." value={feedbackForm.obstaculos} onChange={e => setFeedbackForm(p => ({ ...p, obstaculos: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pergunta para o Marcelo</label>
              <input className="input mt-1" placeholder="Deixe uma dúvida ou sugestão..." value={feedbackForm.pergunta} onChange={e => setFeedbackForm(p => ({ ...p, pergunta: e.target.value }))} />
            </div>
            <div>
              <label className="label">Seu peso hoje (kg)</label>
              <input type="number" step="0.1" min="30" max="300" className="input mt-1" placeholder="Ex: 75.5" value={feedbackForm.pesoAtual} onChange={e => setFeedbackForm(p => ({ ...p, pesoAtual: e.target.value }))} />
            </div>
            {actionError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{actionError}</div>}
            <button onClick={enviarFeedback} disabled={savingFeedback} className="btn-primary w-full">
              {savingFeedback ? <Loader2 size={16} className="animate-spin" /> : null}
              {savingFeedback ? 'Enviando...' : 'Enviar e Concluir'}
            </button>
          </div>
        )}

        {/* Celebration */}
        {showCelebration && (() => {
          const hoje = new Date()
          const jsDay = hoje.getDay()
          const activeIdx = jsDay === 0 ? 6 : jsDay - 1
          const grupos = [...new Set(itens.filter(i => exercisesDone.has(i.id)).map(i => i.exercicio?.grupo_muscular).filter(Boolean))] as string[]
          return (
            <div className="bg-white rounded-2xl shadow-card px-5 pt-6 pb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Dumbbell size={18} className="text-white" />
                </div>
                <span className="font-extrabold text-secondary text-lg tracking-tight">MC Treino</span>
              </div>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={44} className="text-green-500 fill-green-50" />
              </div>
              <h2 className="text-2xl font-extrabold text-secondary mb-1">Treino Concluído!</h2>
              <p className="text-sm text-outline mb-5">{hoje.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</p>
              <div className="flex justify-center gap-1.5 mb-5">
                {['S','T','Q','Q','S','S','D'].map((d, i) => (
                  <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${i === activeIdx ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-outline'}`}>{d}</div>
                ))}
              </div>
              {rotinaName && <p className="text-xs text-outline mb-0.5">{rotinaName}</p>}
              <p className="text-lg font-extrabold text-secondary mb-3">{sessao.dia_letra ? `${sessao.dia_letra} – ` : ''}{sessao.nome}</p>
              {grupos.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                  {grupos.map(g => <span key={g} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wide">{g}</span>)}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-base font-extrabold text-primary tabular-nums">{fmt(sessionSecs)}</p>
                  <p className="text-[10px] text-outline mt-0.5">Duração</p>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-base font-extrabold text-primary tabular-nums">{exercisesDone.size}/{itens.length}</p>
                  <p className="text-[10px] text-outline mt-0.5">Exercícios</p>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-base font-extrabold text-primary tabular-nums">{calcVolume().toFixed(0)}kg</p>
                  <p className="text-[10px] text-outline mt-0.5">Volume</p>
                </div>
              </div>
              <canvas ref={shareCanvasRef} className="hidden" />
              <div className="space-y-2">
                <button onClick={handleShare} className="btn-primary w-full gap-2">
                  <Share2 size={16} />Compartilhar meu treino
                </button>
                <p className="text-xs text-outline leading-snug px-2">Para fundo transparente, use Compartilhar.</p>
                <button onClick={() => router.push('/treino')} className="btn-ghost w-full text-sm text-outline">Continuar</button>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
