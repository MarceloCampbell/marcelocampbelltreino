'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, ChevronDown, ChevronUp, Loader2, X,
  Dumbbell, Clock, Play, Maximize2, RefreshCw, Share2,
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

type FeedbackForm = {
  energia: number
  progressoCarga: string
  exercicioDificil: string
  melhorMomento: string
  sentiu_dor: boolean
  descricao_dor: string
  obstaculos: string
  pergunta: string
  pesoAtual: string
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)
  return m ? m[1] : null
}

function VideoThumb({ url, nome, size = 'sm' }: { url: string; nome: string; size?: 'sm' | 'lg' | 'full' }) {
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
  const dims = size === 'full' ? 'w-full aspect-video' : size === 'lg' ? 'w-36 h-28' : 'w-16 h-12'
  return (
    <button onClick={() => setPlaying(true)} className={`relative ${dims} rounded-xl overflow-hidden flex-shrink-0 block hover:opacity-95 transition-opacity`} title={`Ver: ${nome}`}>
      <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={nome} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow">
          <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[7px] border-t-transparent border-b-transparent border-l-[#64A1EE] ml-0.5" />
        </div>
      </div>
    </button>
  )
}

function SessaoCard({ sessao, highlight, alunoId, semanaAtual, rotinaName }: {
  sessao: Sessao
  highlight: boolean
  alunoId: string
  semanaAtual?: number
  rotinaName?: string
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
  const [isRealizado, setIsRealizado] = useState(sessao.status === 'realizado')
  const [actionError, setActionError] = useState<string | null>(null)

  // Exercise tracking
  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null)
  const [cargaRegistrada, setCargaRegistrada] = useState<Record<string, string>>({})
  const [exercisesDone, setExercisesDone] = useState<Set<string>>(new Set())
  // Per-series check: itemId → set of 1-based series indices done
  const [seriesDone, setSeriesDone] = useState<Record<string, Set<number>>>({})

  // Incomplete exercises dialog
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false)
  const [incompleteReasons, setIncompleteReasons] = useState<Record<string, string>>({})

  // Comprehensive feedback form
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    energia: 5,
    progressoCarga: '',
    exercicioDificil: '',
    melhorMomento: '',
    sentiu_dor: false,
    descricao_dor: '',
    obstaculos: '',
    pergunta: '',
    pesoAtual: '',
  })
  const [savingFeedback, setSavingFeedback] = useState(false)

  // Celebration screen
  const [showCelebration, setShowCelebration] = useState(false)
  const shareCanvasRef = useRef<HTMLCanvasElement>(null)

  // Last load reference per exercise
  const [lastLoads, setLastLoads] = useState<Record<string, number>>({})

  const itens = sessao.sessao_itens?.sort((a, b) => a.ordem - b.ordem) ?? []

  useEffect(() => {
    if (itens.length === 0) return
    const itemIds = itens.map(i => i.id)
    supabase
      .from('set_executions')
      .select('sessao_item_id, carga_registrada, criado_em')
      .in('sessao_item_id', itemIds)
      .eq('concluida', true)
      .not('carga_registrada', 'is', null)
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const loads: Record<string, number> = {}
        for (const row of data) {
          if (!loads[row.sessao_item_id]) loads[row.sessao_item_id] = row.carga_registrada
        }
        setLastLoads(loads)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!alunoId) return
    supabase.from('access_logs').insert({
      aluno_id: alunoId,
      tipo: 'rotina_visualizada',
      referencia_id: sessao.id,
    }).then(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (idx !== -1) {
      setProgressIdx(p => Math.max(p, idx + 1))
      const nextItem = itens[idx + 1]
      const nextVid = nextItem?.exercicio?.video_url
        ? nextItem.exercicio.video_url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)?.[1]
        : null
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

  function stopRestTimer() {
    setRestTimer(null)
    setRestTimerFullscreen(false)
    setRestTimerPaused(false)
  }

  function calcVolume(): number {
    return itens.reduce((total, item) => {
      if (!exercisesDone.has(item.id)) return total
      const carga = parseFloat(cargaRegistrada[item.id] || '0') || (item.carga_kg ?? 0)
      const reps = parseInt(item.repeticoes ?? '0') || 0
      return total + carga * reps * (item.series ?? 0)
    }, 0)
  }

  async function iniciarTreino() {
    setIniciado(true)
    setSessionSecs(0)
    setIsRealizado(false)
    setShowCelebration(false)
    setShowFeedbackForm(false)
    setShowIncompleteDialog(false)
    setExercisesDone(new Set())
    setSeriesDone({})
    setCargaRegistrada({})
    try {
      const { data } = await supabase.from('workout_sessions').insert({
        aluno_id: alunoId,
        sessao_id: sessao.id,
        iniciado_em: new Date().toISOString(),
        status: 'em_andamento',
      }).select('id').single()
      if (data) setWorkoutSessionId(data.id)
    } catch { /* non-critical */ }
  }

  function toggleExerciseDone(itemId: string, totalSeries?: number) {
    setExercisesDone(prev => {
      const s = new Set(prev)
      const nowDone = !s.has(itemId)
      nowDone ? s.add(itemId) : s.delete(itemId)
      // sync all series bubbles
      if (totalSeries) {
        setSeriesDone(sd => ({
          ...sd,
          [itemId]: nowDone
            ? new Set(Array.from({ length: totalSeries }, (_, i) => i + 1))
            : new Set(),
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
      setExercisesDone(ed => {
        const s = new Set(ed)
        allDone ? s.add(itemId) : s.delete(itemId)
        return s
      })
      return { ...prev, [itemId]: current }
    })
  }

  async function finalizarTreino() {
    setCompleting(true)
    setActionError(null)
    setIniciado(false) // Item 5: stop timer on finalization
    try {
      const { error: err } = await supabase.from('sessoes_treino').update({ status: 'realizado' }).eq('id', sessao.id)
      if (err) throw err
      setIsRealizado(true)

      const incompleteItems = itens.filter(i => !exercisesDone.has(i.id))

      if (workoutSessionId) {
        await supabase.from('workout_sessions').update({
          concluido_em: new Date().toISOString(),
          status: incompleteItems.length > 0 ? 'incompleto' : 'concluido',
          motivo_incompleto: incompleteItems.length > 0
            ? incompleteItems.map(i => `${i.exercicio?.nome ?? '?'}: ${incompleteReasons[i.id] || 'Não informado'}`).join('; ')
            : null,
        }).eq('id', workoutSessionId)

        // Save set_executions for completed exercises
        for (const item of itens) {
          if (!exercisesDone.has(item.id)) continue
          const carga = parseFloat(cargaRegistrada[item.id] || '0') || null
          const series = item.series ?? 0
          if (series > 0) {
            await supabase.from('set_executions').insert(
              Array.from({ length: series }, (_, idx) => ({
                session_id: workoutSessionId,
                sessao_item_id: item.id,
                numero_serie: idx + 1,
                carga_registrada: carga,
                concluida: true,
              }))
            )
          }
        }
      }

      setShowIncompleteDialog(false)
      setShowFeedbackForm(true)
    } catch {
      setActionError('Não conseguimos salvar. Tentar de novo?')
      setIniciado(true) // resume timer on error
    } finally {
      setCompleting(false)
    }
  }

  async function marcarRealizado() {
    const incompleteItems = itens.filter(i => !exercisesDone.has(i.id))
    if (incompleteItems.length > 0) {
      setShowIncompleteDialog(true)
      return
    }
    await finalizarTreino()
  }

  async function enviarFeedbackCompleto() {
    setSavingFeedback(true)
    setActionError(null)
    try {
      const incompleteList = itens
        .filter(i => !exercisesDone.has(i.id))
        .map(i => ({ nome: i.exercicio?.nome ?? '?', motivo: incompleteReasons[i.id] || 'Não informado' }))

      await supabase.from('workout_feedbacks').insert({
        aluno_id: alunoId,
        sessao_id: sessao.id,
        workout_session_id: workoutSessionId,
        energia_nivel: feedbackForm.energia,
        progresso_carga: feedbackForm.progressoCarga || null,
        exercicio_mais_dificil: feedbackForm.exercicioDificil || null,
        melhor_momento: feedbackForm.melhorMomento || null,
        sentiu_dor: feedbackForm.sentiu_dor,
        descricao_dor: feedbackForm.descricao_dor || null,
        obstaculos: feedbackForm.obstaculos || null,
        pergunta_marcelo: feedbackForm.pergunta || null,
        peso_atual: feedbackForm.pesoAtual ? parseFloat(feedbackForm.pesoAtual) : null,
        exercicios_incompletos: incompleteList.length > 0 ? incompleteList : null,
      })

      setShowFeedbackForm(false)
      setShowCelebration(true)
    } catch {
      setActionError('Não foi possível salvar o feedback.')
    } finally {
      setSavingFeedback(false)
    }
  }

  function drawShareCard(canvas: HTMLCanvasElement) {
    const W = 540, H = 960
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Transparent background (PNG with alpha channel)
    ctx.clearRect(0, 0, W, H)

    // Top accent bar
    ctx.fillStyle = '#1E6FD9'
    ctx.fillRect(0, 0, W, 6)

    // Brand
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 8
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#4A90D9'
    ctx.textAlign = 'center'
    ctx.fillText('MC TREINO', W / 2, 60)
    ctx.shadowBlur = 0

    // Check circle
    ctx.beginPath()
    ctx.arc(W / 2, 155, 52, 0, Math.PI * 2)
    ctx.fillStyle = '#14532D'
    ctx.fill()
    ctx.strokeStyle = '#22C55E'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(W / 2 - 20, 155)
    ctx.lineTo(W / 2 - 4, 172)
    ctx.lineTo(W / 2 + 22, 138)
    ctx.stroke()

    // Title
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Treino Concluído!', W / 2, 248)
    ctx.shadowBlur = 0

    // Date
    const hoje = new Date()
    const dateStr = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 6
    ctx.fillStyle = '#CBD5E1'
    ctx.font = '19px system-ui, -apple-system, sans-serif'
    ctx.fillText(dateStr, W / 2, 285)
    ctx.shadowBlur = 0

    // Day of week indicators
    const dayLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
    const jsDay = hoje.getDay()
    const activeIdx = jsDay === 0 ? 6 : jsDay - 1
    const dotSpacing = 52
    const totalW = dayLetters.length * dotSpacing
    const startX = (W - totalW) / 2 + dotSpacing / 2
    dayLetters.forEach((d, i) => {
      const x = startX + i * dotSpacing
      ctx.beginPath()
      ctx.arc(x, 348, 20, 0, Math.PI * 2)
      ctx.fillStyle = i === activeIdx ? '#1E6FD9' : '#1E2D45'
      ctx.fill()
      ctx.fillStyle = i === activeIdx ? '#FFFFFF' : '#475569'
      ctx.font = `${i === activeIdx ? 'bold ' : ''}14px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(d, x, 354)
    })

    // Divider
    ctx.strokeStyle = '#1E2D45'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 395)
    ctx.lineTo(W - 60, 395)
    ctx.stroke()

    // Rotina name
    if (rotinaName) {
      ctx.fillStyle = '#475569'
      ctx.font = '16px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(rotinaName, W / 2, 430)
    }

    // Treino name
    const treinoLabel = (sessao.dia_letra ? `${sessao.dia_letra} – ` : '') + sessao.nome
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    const treinoText = treinoLabel.length > 28 ? treinoLabel.slice(0, 28) + '…' : treinoLabel
    ctx.fillText(treinoText, W / 2, rotinaName ? 468 : 445)
    ctx.shadowBlur = 0

    // Muscle groups
    const grupos = [...new Set(
      itens.filter(i => exercisesDone.has(i.id)).map(i => i.exercicio?.grupo_muscular).filter(Boolean)
    )] as string[]
    if (grupos.length > 0) {
      const gruposText = grupos.join(' · ').toUpperCase()
      ctx.fillStyle = '#4A90D9'
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      const gt = gruposText.length > 45 ? gruposText.slice(0, 45) + '…' : gruposText
      ctx.fillText(gt, W / 2, rotinaName ? 500 : 477)
    }

    // Stats bar
    const statsY = 570
    ctx.fillStyle = 'rgba(15, 30, 50, 0.82)'
    ctx.roundRect(40, statsY - 30, W - 80, 80, 16)
    ctx.fill()
    const stats = [
      { label: 'DURAÇÃO', value: fmt(sessionSecs) },
      { label: 'EXERCÍCIOS', value: `${exercisesDone.size}/${itens.length}` },
      { label: 'VOLUME', value: `${calcVolume().toFixed(0)}kg` },
    ]
    stats.forEach((stat, i) => {
      const x = 40 + (W - 80) / 6 + i * (W - 80) / 3
      ctx.fillStyle = '#4A90D9'
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stat.value, x, statsY + 10)
      ctx.fillStyle = '#475569'
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillText(stat.label, x, statsY + 28)
    })

    // Footer
    ctx.fillStyle = 'rgba(6, 14, 26, 0.88)'
    ctx.fillRect(0, H - 70, W, 70)
    ctx.fillStyle = '#1E6FD9'
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('mc-treino.app', W / 2, H - 38)
    ctx.fillStyle = '#2A3F5A'
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillText('Registre. Evolua. Compartilhe.', W / 2, H - 16)
  }

  async function handleShare() {
    const canvas = shareCanvasRef.current
    if (!canvas) return
    drawShareCard(canvas)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'meu-treino.png', { type: 'image/png' })
      try {
        if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Treino Concluído!', text: `Concluí o treino "${sessao.nome}" no MC Treino!` })
        } else if (typeof navigator.share === 'function') {
          await navigator.share({ title: 'Treino Concluído!', text: `Concluí o treino "${sessao.nome}" no MC Treino!` })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'meu-treino.png'
          a.click()
          URL.revokeObjectURL(url)
        }
      } catch { /* user cancelled */ }
    }, 'image/png')
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
              <button onClick={iniciarTreino} className="btn-primary w-full">
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
                  {exercisesDone.size === 0 ? `${itens.length} exercícios` : `${exercisesDone.size} de ${itens.length} concluídos`}
                </span>
                {exercisesDone.size > 0 && (
                  <span className="text-xs text-primary font-bold">{Math.round((exercisesDone.size / itens.length) * 100)}%</span>
                )}
              </div>
              {exercisesDone.size > 0 && (
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(exercisesDone.size / itens.length) * 100}%` }}
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
                const isDone = exercisesDone.has(item.id)

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
                  <div key={item.id} className={`p-4 transition-colors ${isDone ? 'bg-green-50/50' : ''}`}>

                    {/* 1. Nome + botão substituto */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        {showSubstituto && (
                          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-0.5">Substituto</p>
                        )}
                        <p className="font-bold text-secondary text-lg leading-tight">
                          {showSubstituto ? ex!.substituto!.nome : (ex?.nome ?? '–')}
                        </p>
                        {lastLoads[item.id] && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">Última carga: {lastLoads[item.id]}kg</p>
                        )}
                      </div>
                      {ex?.substituto && (
                        <button
                          onClick={() => setSubstitutoAberto(substitutoAberto === item.id ? null : item.id)}
                          className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:text-orange-700 transition-colors flex-shrink-0 mt-1"
                        >
                          <RefreshCw size={11} />
                          {substitutoAberto === item.id ? 'Original' : 'Sub'}
                        </button>
                      )}
                    </div>

                    {/* 2. Vídeo — largura total */}
                    {videoToShow?.video_url && (
                      <div className="mb-3">
                        <VideoThumb url={videoToShow.video_url} nome={videoToShow.nome} size="full" />
                      </div>
                    )}

                    {/* 3. Séries + bubbles de marcação */}
                    {(series || repeticoes) && (
                      <p className="text-sm font-semibold text-secondary mb-2">
                        {series && repeticoes ? `${series}×${repeticoes}` : (series ?? repeticoes)}
                      </p>
                    )}
                    {iniciado && (series ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        {Array.from({ length: series as number }).map((_, i) => {
                          const sNum = i + 1
                          const checked = seriesDone[item.id]?.has(sNum) ?? false
                          return (
                            <button
                              key={sNum}
                              onClick={() => toggleSerie(item.id, sNum, series as number)}
                              className={`w-8 h-8 rounded-full border-2 text-sm font-bold flex items-center justify-center transition-all ${
                                checked
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-green-400 hover:text-green-500'
                              }`}
                            >
                              {checked ? '✓' : sNum}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* 4. Marcar como feito */}
                    {iniciado && (
                      <button
                        onClick={() => toggleExerciseDone(item.id, series ?? undefined)}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors mb-3 ${isDone ? 'text-green-600' : 'text-outline hover:text-green-600'}`}
                      >
                        <CheckCircle2 size={18} className={isDone ? 'fill-green-100' : ''} />
                        {isDone ? 'Exercício concluído' : 'Marcar como feito'}
                      </button>
                    )}

                    {/* 5. Intervalo — só ícone + valor, sem rótulo */}
                    {intervalo && (
                      <button
                        onClick={() => startRestTimer(item)}
                        className={`flex items-center gap-1.5 text-sm font-semibold mb-3 transition-colors ${isResting ? 'text-orange-500' : 'text-secondary hover:text-primary'}`}
                      >
                        <Clock size={14} />
                        <span>{isResting ? fmt(restTimer!.secs) : `${intervalo}s`}</span>
                      </button>
                    )}

                    {/* 6. Carga */}
                    {iniciado ? (
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
                    ) : carga ? (
                      <p className="text-sm text-secondary mb-2">
                        <span className="font-semibold">Carga sugerida:</span> {carga}kg
                      </p>
                    ) : null}

                    {/* 7. Instruções */}
                    {item.observacoes && (
                      <p className="text-sm text-outline leading-snug">{item.observacoes}</p>
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

          {/* Incomplete exercises dialog — Item 3 */}
          {showIncompleteDialog && (() => {
            const incompleteItems = itens.filter(i => !exercisesDone.has(i.id))
            return (
              <div className="mx-5 mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <p className="font-bold text-secondary mb-1">Exercícios sem conclusão ({incompleteItems.length})</p>
                <p className="text-sm text-outline mb-4">Selecione o motivo para cada um:</p>
                <div className="space-y-5 max-h-64 overflow-y-auto pr-1">
                  {incompleteItems.map(item => (
                    <div key={item.id}>
                      <p className="text-sm font-semibold text-secondary mb-2">{item.exercicio?.nome ?? 'Exercício'}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Máquina ocupada', 'Dor ou desconforto', 'Falta de tempo', 'Outro'].map(m => (
                          <button
                            key={m}
                            onClick={() => setIncompleteReasons(prev => ({ ...prev, [item.id]: m }))}
                            className={`text-xs font-semibold py-2 px-2 rounded-xl border transition-all ${incompleteReasons[item.id] === m ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-outline-variant hover:border-primary'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={finalizarTreino}
                    disabled={completing}
                    className="btn-primary flex-1"
                  >
                    {completing ? <Loader2 size={14} className="animate-spin" /> : null}
                    Concluir assim mesmo
                  </button>
                  <button onClick={() => setShowIncompleteDialog(false)} className="btn-ghost text-sm">Cancelar</button>
                </div>
              </div>
            )
          })()}

          {!isRealizado && !showIncompleteDialog && !showFeedbackForm && !showCelebration && (
            <div className="px-5 pb-5">
              <button onClick={marcarRealizado} disabled={completing} className="btn-primary w-full">
                {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {completing ? 'Salvando...' : 'Finalizar Treino'}
              </button>
            </div>
          )}

          {/* Celebration screen */}
          {showCelebration && (() => {
            const hoje = new Date()
            const jsDay = hoje.getDay()
            const activeIdx = jsDay === 0 ? 6 : jsDay - 1
            const grupos = [...new Set(
              itens.filter(i => exercisesDone.has(i.id)).map(i => i.exercicio?.grupo_muscular).filter(Boolean)
            )] as string[]
            return (
              <div className="border-t border-outline-variant">
                <div className="px-5 pt-6 pb-8 text-center">
                  {/* Brand */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Dumbbell size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-secondary text-lg tracking-tight">MC Treino</span>
                  </div>

                  {/* Check circle */}
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={44} className="text-green-500 fill-green-50" />
                  </div>

                  <h2 className="text-2xl font-extrabold text-secondary mb-1">Treino Concluído!</h2>
                  <p className="text-sm text-outline mb-5">
                    {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>

                  {/* Day of week bubbles */}
                  <div className="flex justify-center gap-1.5 mb-5">
                    {['S','T','Q','Q','S','S','D'].map((d, i) => (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          i === activeIdx ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-outline'
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Rotina + treino name */}
                  {rotinaName && (
                    <p className="text-xs text-outline mb-0.5">{rotinaName}</p>
                  )}
                  <p className="text-lg font-extrabold text-secondary mb-3">
                    {sessao.dia_letra ? `${sessao.dia_letra} – ` : ''}{sessao.nome}
                  </p>

                  {/* Muscle groups */}
                  {grupos.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                      {grupos.map(g => (
                        <span key={g} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wide">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
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

                  {/* Hidden canvas for share */}
                  <canvas ref={shareCanvasRef} className="hidden" />

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <button onClick={handleShare} className="btn-primary w-full gap-2">
                      <Share2 size={16} />
                      Compartilhar meu treino
                    </button>
                    <p className="text-xs text-outline text-center leading-snug px-2">
                      Para manter o fundo transparente, use o botão Compartilhar.
                    </p>
                    <button onClick={() => router.push('/treino')} className="btn-ghost w-full text-sm text-outline">
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Comprehensive feedback form — Item 4 */}
          {showFeedbackForm && (
            <div className="px-5 pb-5 border-t border-outline-variant">
              <div className="py-4 text-center">
                <p className="text-3xl mb-1">🏆</p>
                <p className="font-extrabold text-secondary text-lg">Treino concluído!</p>
                <p className="text-sm text-outline mt-1">{fmt(sessionSecs)} · {exercisesDone.size}/{itens.length} exercícios · {calcVolume().toFixed(0)} kg volume</p>
              </div>

              <h4 className="font-bold text-secondary mb-4">Como foi o treino?</h4>
              <div className="space-y-5">

                {/* Energia */}
                <div>
                  <label className="label">Nível de energia (1–10)</label>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n}
                        onClick={() => setFeedbackForm(p => ({ ...p, energia: n }))}
                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${feedbackForm.energia === n ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary hover:border-primary'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progresso de carga */}
                <div>
                  <label className="label">Progredi nas cargas esta semana?</label>
                  <div className="flex gap-2 mt-1">
                    {[{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}, {v:'em_alguns', l:'Em alguns'}].map(({v, l}) => (
                      <button
                        key={v}
                        onClick={() => setFeedbackForm(p => ({ ...p, progressoCarga: v }))}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${feedbackForm.progressoCarga === v ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-outline-variant hover:border-primary'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercício mais difícil */}
                <div>
                  <label className="label">Exercício mais difícil do treino</label>
                  <input
                    className="input mt-1"
                    placeholder="Nome do exercício..."
                    value={feedbackForm.exercicioDificil}
                    onChange={e => setFeedbackForm(p => ({ ...p, exercicioDificil: e.target.value }))}
                  />
                </div>

                {/* Melhor momento */}
                <div>
                  <label className="label">Melhor momento do treino</label>
                  <input
                    className="input mt-1"
                    placeholder="O que te surpreendeu positivamente?"
                    value={feedbackForm.melhorMomento}
                    onChange={e => setFeedbackForm(p => ({ ...p, melhorMomento: e.target.value }))}
                  />
                </div>

                {/* Dor */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackForm.sentiu_dor}
                      onChange={e => setFeedbackForm(p => ({ ...p, sentiu_dor: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-secondary font-medium">Senti dor ou desconforto</span>
                  </label>
                  {feedbackForm.sentiu_dor && (
                    <input
                      className="input mt-2"
                      placeholder="Onde? Quando no treino?"
                      value={feedbackForm.descricao_dor}
                      onChange={e => setFeedbackForm(p => ({ ...p, descricao_dor: e.target.value }))}
                    />
                  )}
                </div>

                {/* Obstáculos */}
                <div>
                  <label className="label">Obstáculos encontrados</label>
                  <input
                    className="input mt-1"
                    placeholder="Fila, máquina ocupada, tempo curto..."
                    value={feedbackForm.obstaculos}
                    onChange={e => setFeedbackForm(p => ({ ...p, obstaculos: e.target.value }))}
                  />
                </div>

                {/* Pergunta para Marcelo */}
                <div>
                  <label className="label">Pergunta para o Marcelo</label>
                  <input
                    className="input mt-1"
                    placeholder="Deixe uma dúvida ou sugestão..."
                    value={feedbackForm.pergunta}
                    onChange={e => setFeedbackForm(p => ({ ...p, pergunta: e.target.value }))}
                  />
                </div>

                {/* Peso atual */}
                <div>
                  <label className="label">Seu peso hoje (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    className="input mt-1"
                    placeholder="Ex: 75.5"
                    value={feedbackForm.pesoAtual}
                    onChange={e => setFeedbackForm(p => ({ ...p, pesoAtual: e.target.value }))}
                  />
                </div>

                {actionError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3">
                    {actionError}
                  </div>
                )}

                <button onClick={enviarFeedbackCompleto} disabled={savingFeedback} className="btn-primary w-full">
                  {savingFeedback ? <Loader2 size={16} className="animate-spin" /> : null}
                  {savingFeedback ? 'Enviando...' : 'Enviar e Concluir'}
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
          <SessaoCard sessao={treinoHoje} highlight alunoId={alunoId} semanaAtual={semanaAtual} rotinaName={ciclo.nome} />
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
          <SessaoCard key={s.id} sessao={s} highlight={false} alunoId={alunoId} semanaAtual={semanaAtual} rotinaName={ciclo.nome} />
        ))
      }
    </div>
  )
}
