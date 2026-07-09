'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type FeedbackSemanal = {
  id: string
  semana_referencia: string
  aderencia_0_10: number | null
  treinos_feitos: number | null
  cardios_feitos: number | null
  energia: string | null
  sentiu_dor: boolean
  descricao_dor: string | null
  duvida_semana: string | null
}

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export function FeedbackSemanalClient({ alunoId, feedbacks: initial }: { alunoId: string; feedbacks: FeedbackSemanal[] }) {
  const supabase = createClient()
  const [feedbacks, setFeedbacks] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const semanaAtual = getMondayOfWeek()
  const jaEnviou = feedbacks.some(f => f.semana_referencia === semanaAtual)

  const [form, setForm] = useState({
    treinos_feitos: '',
    cardios_feitos: '',
    sentiu_dor: false,
    descricao_dor: '',
    evoluiu_carga_reps: '',
    energia: '',
    exercicio_dificuldade: '',
    treino_mais_dificil: '',
    treino_melhor_semana: '',
    aderencia_0_10: '',
    o_que_atrapalhou: '',
    duvida_semana: '',
    peso_atual: '',
  })

  async function enviar() {
    setSaving(true)
    const { data } = await supabase.from('feedbacks_semanais').insert({
      aluno_id: alunoId,
      semana_referencia: semanaAtual,
      treinos_feitos: form.treinos_feitos ? parseInt(form.treinos_feitos) : null,
      cardios_feitos: form.cardios_feitos ? parseInt(form.cardios_feitos) : null,
      sentiu_dor: form.sentiu_dor,
      descricao_dor: form.descricao_dor || null,
      evoluiu_carga_reps: form.evoluiu_carga_reps || null,
      energia: form.energia || null,
      exercicio_dificuldade: form.exercicio_dificuldade || null,
      treino_mais_dificil: form.treino_mais_dificil || null,
      treino_melhor_semana: form.treino_melhor_semana || null,
      aderencia_0_10: form.aderencia_0_10 ? parseInt(form.aderencia_0_10) : null,
      o_que_atrapalhou: form.o_que_atrapalhou || null,
      duvida_semana: form.duvida_semana || null,
      peso_atual: form.peso_atual ? parseFloat(form.peso_atual) : null,
    }).select().single()
    if (data) {
      setFeedbacks(prev => [data, ...prev])
      setDone(true)
    }
    setSaving(false)
  }

  const def = (f: string, v: string | string[]) => setForm(p => ({ ...p, [f]: v }))

  return (
    <div>
      {!jaEnviou && !done && (
        <div className="card mb-8">
          <h2 className="font-extrabold text-secondary text-lg mb-1">Check-in da Semana</h2>
          <p className="text-sm text-outline mb-6">Semana de {new Date(semanaAtual + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Treinos realizados</label>
                <input type="number" className="input" placeholder="Ex: 4" value={form.treinos_feitos} onChange={e => def('treinos_feitos', e.target.value)} />
              </div>
              <div>
                <label className="label">Cárdios realizados</label>
                <input type="number" className="input" placeholder="Ex: 2" value={form.cardios_feitos} onChange={e => def('cardios_feitos', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Aderência geral (0–10)</label>
              <div className="flex gap-2 mt-1">
                {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => def('aderencia_0_10', String(n))}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${form.aderencia_0_10 === String(n) ? 'bg-primary-dark text-white' : 'bg-white border border-outline-variant text-secondary hover:border-primary'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Nível de energia esta semana</label>
              <div className="flex gap-2 mt-1">
                {['Ótimo', 'Bom', 'Regular', 'Baixo', 'Péssimo'].map(e => (
                  <button
                    key={e}
                    onClick={() => def('energia', e)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${form.energia === e ? 'bg-primary-dark text-white border-primary-dark' : 'bg-white border-outline-variant text-secondary'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Evoluiu em carga ou repetições?</label>
              <div className="flex gap-2">
                {['Sim', 'Não', 'Em alguns exercícios'].map(v => (
                  <button key={v} onClick={() => def('evoluiu_carga_reps', v)} className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${form.evoluiu_carga_reps === v ? 'bg-primary-dark text-white border-primary-dark' : 'bg-white border-outline-variant text-secondary'}`}>{v}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Exercício com mais dificuldade</label>
              <input className="input" placeholder="Ex: Agachamento livre" value={form.exercicio_dificuldade} onChange={e => def('exercicio_dificuldade', e.target.value)} />
            </div>
            <div>
              <label className="label">Melhor treino da semana</label>
              <input className="input" placeholder="Ex: Superior A – senti muito forte" value={form.treino_melhor_semana} onChange={e => def('treino_melhor_semana', e.target.value)} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.sentiu_dor} onChange={e => def('sentiu_dor', e.target.checked as any)} className="w-4 h-4" />
              <span className="text-sm font-medium text-secondary">Senti dor ou desconforto esta semana</span>
            </label>
            {form.sentiu_dor && (
              <textarea className="input min-h-[80px]" placeholder="Onde sentiu dor? Quando? Durante qual exercício?" value={form.descricao_dor} onChange={e => def('descricao_dor', e.target.value)} />
            )}

            <div>
              <label className="label">O que atrapalhou seus treinos?</label>
              <input className="input" placeholder="Ex: trabalho, cansaço, viagem" value={form.o_que_atrapalhou} onChange={e => def('o_que_atrapalhou', e.target.value)} />
            </div>
            <div>
              <label className="label">Dúvida da semana</label>
              <textarea className="input min-h-[80px]" placeholder="Manda sua dúvida para o Marcelo..." value={form.duvida_semana} onChange={e => def('duvida_semana', e.target.value)} />
            </div>
            <div>
              <label className="label">Peso atual (kg)</label>
              <input type="number" step="0.1" className="input max-w-xs" placeholder="Ex: 82.5" value={form.peso_atual} onChange={e => def('peso_atual', e.target.value)} />
            </div>
          </div>

          <button onClick={enviar} disabled={saving} className="btn-primary w-full mt-8">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar Check-in da Semana'}
          </button>
        </div>
      )}

      {(jaEnviou || done) && (
        <div className="card mb-8 text-center py-10">
          <CheckCircle2 size={48} className="mx-auto text-green-400 mb-3" />
          <h3 className="font-extrabold text-secondary text-lg">Check-in enviado!</h3>
          <p className="text-sm text-outline mt-1">Marcelo vai analisar suas respostas em breve.</p>
        </div>
      )}

      {feedbacks.length > 0 && (
        <div>
          <h3 className="font-extrabold text-secondary mb-4">Histórico de Check-ins</h3>
          <div className="space-y-3">
            {feedbacks.map(f => (
              <div key={f.id} className="card">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-secondary">Semana de {new Date(f.semana_referencia + 'T00:00').toLocaleDateString('pt-BR')}</p>
                  {f.aderencia_0_10 !== null && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${f.aderencia_0_10 >= 7 ? 'bg-green-50 text-green-700' : f.aderencia_0_10 >= 5 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                      {f.aderencia_0_10}/10
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-outline">
                  {f.treinos_feitos !== null && <span>🏋️ {f.treinos_feitos} treinos</span>}
                  {f.cardios_feitos !== null && <span>🏃 {f.cardios_feitos} cárdios</span>}
                  {f.energia && <span>⚡ {f.energia}</span>}
                  {f.sentiu_dor && <span className="text-red-500">⚠️ Dor relatada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
