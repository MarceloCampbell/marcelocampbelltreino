'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X, RefreshCw } from 'lucide-react'
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
  exercicio: ExercicioComSubstituto | null
}

type Sessao = {
  id: string
  nome: string
  tipo: string
  data: string | null
  status: string
  duracao_min: number | null
  intensidade: string | null
  observacoes: string | null
  orientacoes_aluno: string | null
  sessao_itens: SessaoItem[]
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return m ? m[1] : null
}

function VideoThumbnail({ url, nome }: { url: string; nome: string }) {
  const [playing, setPlaying] = useState(false)
  const vid = extractYoutubeId(url)

  if (!vid) return null

  if (playing) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlaying(false)}>
        <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPlaying(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
            <X size={24} />
          </button>
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${vid}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={nome}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity"
      title={`Ver: ${nome}`}
    >
      <img
        src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
        alt={nome}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
          <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

export function TreinoAlunoClient({ alunoId, sessoes }: { alunoId: string; sessoes: Sessao[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(sessoes.find(s => s.status === 'pendente')?.id ?? null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [feedbackSessao, setFeedbackSessao] = useState<string | null>(null)
  const [pse, setPse] = useState(5)
  const [dor, setDor] = useState(false)
  const [obs, setObs] = useState('')
  const [savingFb, setSavingFb] = useState(false)
  const [substitutoAberto, setSubstitutoAberto] = useState<string | null>(null) // item.id

  const pendentes = sessoes.filter(s => s.status === 'pendente')
  const concluidas = sessoes.filter(s => s.status === 'realizado')

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
    setPse(5)
    setDor(false)
    setObs('')
    setSavingFb(false)
    router.refresh()
  }

  function SessaoCard({ sessao }: { sessao: Sessao }) {
    const isOpen = expanded === sessao.id
    const isRealizado = sessao.status === 'realizado'
    const itens = sessao.sessao_itens?.sort((a, b) => a.ordem - b.ordem) ?? []

    return (
      <div className={`bg-white rounded-xl shadow-card overflow-hidden ${isRealizado ? 'opacity-70' : ''}`}>
        <button
          className="w-full flex items-center gap-4 p-5 text-left"
          onClick={() => setExpanded(isOpen ? null : sessao.id)}
        >
          <div className={`w-4 h-4 rounded-full flex-shrink-0 ${isRealizado ? 'bg-green-400' : 'bg-gray-200'}`} />
          <div className="flex-1">
            <p className="font-bold text-secondary">{sessao.nome}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-outline flex-wrap">
              {sessao.data && <span>{new Date(sessao.data + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>}
              {sessao.duracao_min && <span>· {sessao.duracao_min} min</span>}
              {sessao.intensidade && <span>· {sessao.intensidade}</span>}
              <span>· {itens.length} exercícios</span>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isRealizado ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isRealizado ? 'Concluído' : 'Pendente'}
          </span>
          {isOpen ? <ChevronUp size={16} className="text-outline" /> : <ChevronDown size={16} className="text-outline" />}
        </button>

        {isOpen && (
          <div className="border-t border-outline-variant">
            {(sessao.observacoes || sessao.orientacoes_aluno) && (
              <div className="px-5 py-3 bg-blue-50 text-sm text-primary">
                📋 {sessao.orientacoes_aluno || sessao.observacoes}
              </div>
            )}

            <div className="p-5 space-y-3">
              {itens.map(item => {
                const ex = item.exercicio
                const showSubstituto = substitutoAberto === item.id && ex?.substituto
                const videoToShow = showSubstituto ? ex!.substituto! : ex

                return (
                  <div key={item.id} className="bg-background rounded-xl overflow-hidden">
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-primary flex-shrink-0">
                        {ex?.grupo_muscular?.slice(0, 2).toUpperCase() ?? '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-secondary">{showSubstituto ? ex!.substituto!.nome : (ex?.nome ?? '–')}</p>
                        {showSubstituto && <p className="text-xs text-orange-600 font-semibold">Exercício substituto</p>}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.periodizacao_semanal?.length > 0 ? (() => {
                            const semanas: any[] = item.periodizacao_semanal
                            return (
                              <div className="overflow-x-auto w-full">
                                <table className="text-xs border-collapse mt-1">
                                  <thead>
                                    <tr>
                                      <th className="pr-3 text-outline text-left font-semibold"></th>
                                      {semanas.map((p: any) => <th key={p.semana} className="px-2 text-outline font-semibold text-center">S{p.semana}</th>)}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(['series', 'repeticoes', 'carga_kg'] as const).map(f => (
                                      <tr key={f}>
                                        <td className="pr-3 text-outline">{f === 'carga_kg' ? 'Carga' : f === 'series' ? 'Séries' : 'Reps'}</td>
                                        {semanas.map((p: any) => <td key={p.semana} className="px-2 text-center text-secondary font-medium">{p[f] || '–'}</td>)}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )
                          })() : (
                            <div className="flex flex-wrap gap-2 text-xs text-secondary">
                              {item.series && <span className="bg-white border border-outline-variant px-2 py-0.5 rounded">{item.series} séries</span>}
                              {item.repeticoes && <span className="bg-white border border-outline-variant px-2 py-0.5 rounded">{item.repeticoes} reps</span>}
                              {item.carga_kg && <span className="bg-white border border-outline-variant px-2 py-0.5 rounded">{item.carga_kg}kg</span>}
                              {item.descanso_seg && <span className="bg-white border border-outline-variant px-2 py-0.5 rounded">{item.descanso_seg}s descanso</span>}
                            </div>
                          )}
                        </div>
                        {item.observacoes && <p className="text-xs text-primary mt-1">💡 {item.observacoes}</p>}
                        {ex?.substituto && (
                          <button
                            onClick={() => setSubstitutoAberto(substitutoAberto === item.id ? null : item.id)}
                            className="flex items-center gap-1 text-xs text-orange-600 font-semibold mt-2 hover:text-orange-700 transition-colors"
                          >
                            <RefreshCw size={11} />
                            {substitutoAberto === item.id ? 'Ver original' : 'Exercício Substituto'}
                          </button>
                        )}
                      </div>
                      {videoToShow?.video_url && (
                        <VideoThumbnail url={videoToShow.video_url} nome={videoToShow.nome} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {!isRealizado && feedbackSessao !== sessao.id && (
              <div className="px-5 pb-5">
                <button
                  onClick={() => marcarRealizado(sessao.id)}
                  disabled={completing === sessao.id}
                  className="btn-primary w-full"
                >
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
                        <button
                          key={n}
                          onClick={() => setPse(n)}
                          className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${pse === n ? 'bg-primary-dark text-white' : 'bg-white border border-outline-variant text-secondary hover:border-primary'}`}
                        >
                          {n}
                        </button>
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
                  <button onClick={() => enviarFeedback(sessao.id)} disabled={savingFb} className="btn-primary w-full">
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

  return (
    <div>
      {pendentes.length > 0 && (
        <div className="mb-8">
          <h2 className="font-extrabold text-secondary mb-4">Treinos Pendentes</h2>
          <div className="space-y-3">
            {pendentes.map(s => <SessaoCard key={s.id} sessao={s} />)}
          </div>
        </div>
      )}

      {concluidas.length > 0 && (
        <div>
          <h2 className="font-extrabold text-secondary mb-4">Treinos Concluídos</h2>
          <div className="space-y-3">
            {concluidas.map(s => <SessaoCard key={s.id} sessao={s} />)}
          </div>
        </div>
      )}

      {sessoes.length === 0 && (
        <div className="text-center py-16 text-outline">
          <p className="font-semibold text-lg">Nenhum treino prescrito ainda</p>
          <p className="text-sm mt-1">Aguarde seu treinador montar seu programa.</p>
        </div>
      )}
    </div>
  )
}
