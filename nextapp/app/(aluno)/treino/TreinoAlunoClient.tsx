'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronUp, Dumbbell, Play, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

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
      <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={nome} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow">
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-white ml-0.5" />
        </div>
      </div>
    </button>
  )
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
            <div className="px-5 pb-4 space-y-2">
              {itens.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm text-secondary py-1">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-outline flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.ordem ?? ''}</span>
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

type CicloAtivo = { id: string; nome: string; data_inicio: string | null; data_fim: string | null; status: string } | null

export function TreinoAlunoClient({
  nomeAluno,
  sessoes,
  aerobicos,
  cicloAtivo,
}: {
  nomeAluno: string
  sessoes: Sessao[]
  aerobicos: AerobicoBrief[]
  cicloAtivo: CicloAtivo
}) {
  const { refreshing } = usePullToRefresh()

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

      {refreshing && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-outline">
          <RefreshCw size={14} className="animate-spin" />
          <span>Atualizando...</span>
        </div>
      )}

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

      {/* Navegação para as seções */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1">
        <Link
          href="/rotinas"
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all text-secondary hover:bg-gray-100"
        >
          Rotinas de treino
        </Link>
        <Link
          href="/aerobicos"
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 text-secondary hover:bg-gray-100"
        >
          Aeróbico
          {aerobicosHoje.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600">
              {aerobicosHoje.length}
            </span>
          )}
        </Link>
      </div>

      {/* Treino de hoje */}
      {treinoHoje ? (
        <SessaoCard sessao={treinoHoje} highlight={true} />
      ) : (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <p className="text-5xl mb-4">🛌</p>
          <p className="font-bold text-secondary text-xl">Hoje é dia de descanso!</p>
          <p className="text-sm text-outline mt-2 leading-relaxed max-w-xs mx-auto">
            Recuperação também é treino — durma bem, se alimente bem e volte mais forte amanhã.
          </p>
        </div>
      )}

    </div>
  )
}
