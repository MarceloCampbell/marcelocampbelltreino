'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, ChevronDown, ChevronUp, Loader2, X, RefreshCw,
  Dumbbell, Clock, ChevronRight, Play, Maximize2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
  dia_semana_numero: number | null
  data: string | null
  status: string
  duracao_min: number | null
  intensidade: string | null
  observacoes: string | null
  orientacoes_aluno: string | null
  sessao_itens: SessaoItem[]
}

type AerobicoBrief = {
  id: string
  nome: string
  modalidade: string | null
  duracao_estimada_min: number | null
  distancia_estimada_km: number | null
  intensidade_principal: string | null
  status: string
  data_prevista: string | null
}

const MC_FASES = [
  { fase: 'Adaptação Técnica', series: '3×10–12', missao: 'Encontrar a carga ideal para cada exercício, registrar suas primeiras cargas e aprender a execução perfeita.' },
  { fase: 'Consolidação', series: '3×10–12', missao: 'Melhorar a qualidade dos movimentos e tentar pequenas progressões de carga ou repetições.' },
  { fase: 'Progressão', series: '3×8–10', missao: 'Evoluir as cargas nos exercícios principais mantendo a técnica.' },
  { fase: 'Estabilidade', series: '3×8–10', missao: 'Consolidar as novas cargas e repetir boas execuções.' },
  { fase: 'Volume', series: '3×12–15', missao: 'Buscar maior controle muscular e mais repetições, sem pressa para aumentar a carga.' },
  { fase: 'Intensidade', series: '3×7–9', missao: 'Retomar cargas elevadas e bater novos recordes com segurança.' },
  { fase: 'Expansão', series: '4×7–9', missao: 'Suportar um volume maior de treino mantendo a qualidade.' },
  { fase: 'Força', series: '4×6–8', missao: 'Trabalhar pesado, mantendo foco total na execução.' },
  { fase: 'Performance', series: '4×6–8', missao: 'Entregar sua melhor semana do ciclo.' },
  { fase: 'Refinamento', series: '3×8–10', missao: 'Recuperar um pouco do volume sem perder desempenho.' },
  { fase: 'Recuperação Ativa', series: '3×12–15', missao: 'Recuperar seu corpo, aperfeiçoar a técnica e preparar-se para o próximo ciclo.' },
  { fase: 'Fechamento', series: '3×8–10', missao: 'Avaliar sua evolução, celebrar suas conquistas e iniciar o próximo ciclo ainda melhor.' },
]

function calcSemanaAtual(dataInicio: string | null, dataFim: string | null): { semana: number; total: number } | null {
  if (!dataInicio) return null
  const inicio = new Date(dataInicio + 'T00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 0) return null
  const semana = Math.floor(dias / 7) + 1
  const total = dataFim
    ? Math.max(semana, Math.ceil((new Date(dataFim + 'T00:00').getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : semana
  return { semana: Math.min(semana, total), total }
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)
  return m ? m[1] : null
}

function VideoThumbnail({ url, nome, size = 'sm' }: { url: string; nome: string; size?: 'sm' | 'lg' }) {
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
      <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={nome} className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow">
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

function SessaoCard({ sessao, highlight, completing, onComplete, feedbackSessao, pse, setPse, dor, setDor, obs, setObs, savingFb, onEnviarFeedback, substitutoAberto, setSubstitutoAberto, semanaAtual }: {
  sessao: Sessao
  highlight: boolean
  completing: string | null
  onComplete: (id: string) => void
  feedbackSessao: string | null
  pse: number; setPse: (n: number) => void
  dor: boolean; setDor: (b: boolean) => void
  obs: string; setObs: (s: string) => void
  savingFb: boolean
  onEnviarFeedback: (id: string) => void
  substitutoAberto: string | null
  setSubstitutoAberto: (id: string | null) => void
  semanaAtual?: number
}) {
  const [isOpen, setIsOpen] = useState(highlight)
  const [iniciado, setIniciado] = useState(false)
  const [sessionSecs, setSessionSecs] = useState(0)
  const [restTimer, setRestTimer] = useState<{ itemId: string; secs: number } | null>(null)
  const [restTimerFullscreen, setRestTimerFullscreen] = useState(false)
  const [restTimerPaused, setRestTimerPaused] = useState(false)
  const isRealizado = sessao.status === 'realizado'
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
    setRestTimer({ itemId: item.id, secs: item.descanso_seg ?? 90 })
    setRestTimerFullscreen(true)
    setRestTimerPaused(false)
  }

  function stopRestTimer() {
    setRestTimer(null)
    setRestTimerFullscreen(false)
    setRestTimerPaused(false)
  }

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${highlight ? 'ring-2 ring-primary shadow-lg' : 'shadow-card'}`}>

      {/* Fullscreen rest timer overlay */}
      {restTimerFullscreen && restTimer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-secondary/95 text-white">
          <button
            onClick={() => setRestTimerFullscreen(false)}
            className="absolute top-6 right-6 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6">Intervalo</p>
          <p className="text-[88px] font-extrabold tabular-nums leading-none">
            {fmt(restTimer.secs)}
          </p>
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
            {sessao.intensidade && <span>· {sessao.intensidade}</span>}
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

          {/* Iniciar / Timer row */}
          <div className="px-5 pt-4 pb-1">
            {!iniciado ? (
              <button
                onClick={() => { setIniciado(true); setSessionSecs(0) }}
                className="btn-primary w-full"
              >
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

          {/* Progress indicator */}
          {iniciado && itens.length > 0 && (
            <div className="px-5 pt-2 pb-0">
              <p className="text-xs text-outline font-medium">{itens.length} exercício{itens.length !== 1 ? 's' : ''} neste treino</p>
            </div>
          )}

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

              function renderItemRow(item: SessaoItem, isBiset: boolean) {
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
                        {iniciado && (
                          <button
                            onClick={() => startRestTimer(item)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${isResting ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                          >
                            <Clock size={11} />
                            {isResting ? fmt(restTimer!.secs) : 'Intervalo'}
                          </button>
                        )}
                      </div>
                    </div>

                    {videoToShow?.video_url && (
                      <div className="flex-shrink-0">
                        <VideoThumbnail url={videoToShow.video_url} nome={videoToShow.nome} size="lg" />
                      </div>
                    )}
                  </div>
                )
              }

              return groups.map((group) => {
                if (group.length === 1) {
                  const item = group[0]
                  const isResting = restTimer?.itemId === item.id
                  return (
                    <div key={item.id} className={`bg-background rounded-xl overflow-hidden ${isResting ? 'ring-1 ring-orange-300' : ''}`}>
                      {renderItemRow(item, false)}
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
                        {renderItemRow(item, true)}
                      </div>
                    ))}
                  </div>
                )
              })
            })()}
          </div>

          {!isRealizado && feedbackSessao !== sessao.id && (
            <div className="px-5 pb-5">
              <button onClick={() => onComplete(sessao.id)} disabled={completing === sessao.id} className="btn-primary w-full">
                {completing === sessao.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {completing === sessao.id ? 'Marcando...' : 'Marcar como Concluído'}
              </button>
            </div>
          )}

          {feedbackSessao === sessao.id && (
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
                <button onClick={() => onEnviarFeedback(sessao.id)} disabled={savingFb} className="btn-primary w-full">
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

type CicloAtivo = { id: string; nome: string; data_inicio: string | null; data_fim: string | null; status: string } | null

export function TreinoAlunoClient({
  alunoId,
  nomeAluno,
  sessoes,
  aerobicos,
  cicloAtivo,
}: {
  alunoId: string
  nomeAluno: string
  sessoes: Sessao[]
  aerobicos: AerobicoBrief[]
  cicloAtivo: CicloAtivo
}) {
  const supabase = createClient()
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)
  const [feedbackSessao, setFeedbackSessao] = useState<string | null>(null)
  const [pse, setPse] = useState(5)
  const [dor, setDor] = useState(false)
  const [obs, setObs] = useState('')
  const [savingFb, setSavingFb] = useState(false)
  const [substitutoAberto, setSubstitutoAberto] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'treino' | 'aerobico'>('treino')

  const semanaInfo = cicloAtivo ? calcSemanaAtual(cicloAtivo.data_inicio, cicloAtivo.data_fim) : null
  const faseInfo = semanaInfo ? MC_FASES[semanaInfo.semana - 1] ?? null : null

  const hoje = new Date().getDay()
  const musculacaoSessoes = sessoes.filter(s => s.tipo !== 'aerobico')
  const treinoHoje = musculacaoSessoes.find(s => s.dia_semana_numero !== null && s.dia_semana_numero === hoje) ?? null

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const aerobicosHoje = aerobicos.filter(a => a.data_prevista === todayStr && a.status !== 'cancelado')

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = nomeAluno.split(' ')[0]

  async function marcarRealizado(sessaoId: string) {
    setCompleting(sessaoId)
    await supabase.from('sessoes_treino').update({ status: 'realizado' }).eq('id', sessaoId)
    setFeedbackSessao(sessaoId)
    setCompleting(null)
  }

  async function enviarFeedback(sessaoId: string) {
    setSavingFb(true)
    await supabase.from('feedbacks_treino').insert({
      aluno_id: alunoId,
      sessao_id: sessaoId,
      completou: true,
      pse_final: pse,
      sentiu_dor: dor,
      observacoes_livres: obs || null,
    })
    setFeedbackSessao(null)
    setPse(5); setDor(false); setObs('')
    setSavingFb(false)
    router.refresh()
  }

  const cardProps = {
    completing, onComplete: marcarRealizado,
    feedbackSessao,
    pse, setPse, dor, setDor, obs, setObs, savingFb,
    onEnviarFeedback: enviarFeedback,
    substitutoAberto, setSubstitutoAberto,
    semanaAtual: semanaInfo?.semana,
  }

  if (sessoes.length === 0 && aerobicos.length === 0) {
    return (
      <div className="text-center py-20 text-outline">
        <Dumbbell size={48} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-lg">Nenhum treino prescrito ainda</p>
        <p className="text-sm mt-1">Aguarde seu treinador montar seu programa.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Saudação */}
      <div>
        <p className="text-outline text-sm capitalize">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
        <h1 className="text-2xl font-extrabold text-secondary mt-0.5">{saudacao}, {primeiroNome}!</h1>
      </div>

      {/* Semana banner */}
      {semanaInfo && faseInfo && (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">{cicloAtivo?.nome}</span>
            <span className="text-xs font-bold opacity-90">Semana {semanaInfo.semana} de {semanaInfo.total}</span>
          </div>
          <p className="text-xl font-extrabold">{faseInfo.fase}</p>
          <p className="text-sm font-semibold opacity-90 mt-0.5">{faseInfo.series}</p>
          <div className="mt-3 bg-white/15 rounded-xl p-3">
            <p className="text-xs font-bold opacity-90 mb-1">Missão desta semana</p>
            <p className="text-sm leading-snug">{faseInfo.missao}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1">
        <button
          onClick={() => setActiveTab('treino')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'treino' ? 'bg-primary-dark text-white' : 'text-secondary hover:bg-gray-100'}`}
        >
          Rotinas de treino
        </button>
        <button
          onClick={() => setActiveTab('aerobico')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'aerobico' ? 'bg-primary-dark text-white' : 'text-secondary hover:bg-gray-100'}`}
        >
          Aeróbico
          {aerobicosHoje.length > 0 && (
            <span className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full ${activeTab === 'aerobico' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-600'}`}>
              {aerobicosHoje.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'treino' ? (
        treinoHoje ? (
          <SessaoCard sessao={treinoHoje} highlight={true} {...cardProps} />
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <p className="text-5xl mb-4">🛌</p>
            <p className="font-bold text-secondary text-xl">Hoje é dia de descanso!</p>
            <p className="text-sm text-outline mt-2 leading-relaxed max-w-xs mx-auto">
              Recuperação também é treino — durma bem, se alimente bem e volte mais forte amanhã.
            </p>
          </div>
        )
      ) : (
        aerobicosHoje.length > 0 ? (
          <div className="space-y-3">
            {aerobicosHoje.map(a => (
              <Link key={a.id} href="/aerobicos" className="block bg-white rounded-2xl shadow-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{a.modalidade === 'Corrida' ? '🏃' : a.modalidade === 'Bike' ? '🚴' : '🏋️'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-secondary">{a.nome}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-outline">
                      {a.duracao_estimada_min && <span className="flex items-center gap-1"><Clock size={10} />{a.duracao_estimada_min} min</span>}
                      {a.distancia_estimada_km && <span>{a.distancia_estimada_km} km</span>}
                      {a.intensidade_principal && <span>{a.intensidade_principal}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-outline flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <p className="text-5xl mb-4">🏃</p>
            <p className="font-bold text-secondary text-xl">Sem aeróbico hoje</p>
            <p className="text-sm text-outline mt-2 leading-relaxed">
              Nenhum treino aeróbico programado para hoje.
            </p>
          </div>
        )
      )}

    </div>
  )
}
