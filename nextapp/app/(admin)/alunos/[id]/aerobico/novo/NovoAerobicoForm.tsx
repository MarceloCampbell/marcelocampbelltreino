'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'

type Ciclo = { id: string; nome: string; numero: number }
type TipoBloco = 'aquecimento' | 'principal' | 'recuperacao' | 'volta_calma' | 'observacao_final'

type Bloco = {
  key: string
  tipo_bloco: TipoBloco
  duracao_min: string
  distancia_km: string
  velocidade_kmh: string
  pace_min_km: string
  zona_fc: string
  pse: string
  inclinacao_pct: string
  repeticoes: string
  observacao_treinador: string
}

const TIPOS_BLOCO: { value: TipoBloco; label: string; color: string }[] = [
  { value: 'aquecimento', label: 'Aquecimento', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'principal', label: 'Principal', color: 'bg-blue-100 text-blue-700' },
  { value: 'recuperacao', label: 'Recuperação', color: 'bg-green-100 text-green-700' },
  { value: 'volta_calma', label: 'Volta à Calma', color: 'bg-purple-100 text-purple-700' },
  { value: 'observacao_final', label: 'Obs. Final', color: 'bg-gray-100 text-gray-600' },
]

const MODALIDADES = ['Corrida', 'Caminhada', 'Bike', 'Esteira', 'Elíptico', 'Escada', 'Remo', 'Natação']
const TAGS = ['Z2', 'Intervalado', 'Progressivo', '10km', 'Performance', 'Recuperativo', 'Fartlek', 'Tempo Run']

function novoBloco(tipo: TipoBloco): Bloco {
  return {
    key: crypto.randomUUID(),
    tipo_bloco: tipo,
    duracao_min: '',
    distancia_km: '',
    velocidade_kmh: '',
    pace_min_km: '',
    zona_fc: '',
    pse: '',
    inclinacao_pct: '',
    repeticoes: '',
    observacao_treinador: '',
  }
}

export function NovoAerobicoForm({ alunoId, ciclos }: { alunoId: string; ciclos: Ciclo[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [blocos, setBlocos] = useState<Bloco[]>([
    novoBloco('aquecimento'),
    novoBloco('principal'),
    novoBloco('volta_calma'),
  ])
  const [form, setForm] = useState({
    nome: '',
    ciclo_id: '',
    modalidade: 'Corrida',
    objetivo: '',
    nivel: 'media',
    duracao_estimada_min: '',
    distancia_estimada_km: '',
    intensidade_principal: '',
    local_sugerido: '',
    data_prevista: new Date().toISOString().slice(0, 10),
    obrigatorio: true,
    conta_score_semanal: true,
    conta_missao_semanal: true,
  })

  function updateBloco(key: string, field: string, value: string) {
    setBlocos(prev => prev.map(b => b.key === key ? { ...b, [field]: value } : b))
  }

  function addBloco(tipo: TipoBloco) {
    setBlocos(prev => [...prev, novoBloco(tipo)])
  }

  function removeBloco(key: string) {
    setBlocos(prev => prev.filter(b => b.key !== key))
  }

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleSave() {
    if (!form.nome) { setError('Informe o nome do treino'); return }
    setSaving(true)
    setError('')

    const { data: treino, error: err } = await supabase
      .from('treinos_aerobicos')
      .insert({
        aluno_id: alunoId,
        ciclo_id: form.ciclo_id || null,
        nome: form.nome,
        objetivo: form.objetivo || null,
        modalidade: form.modalidade,
        nivel: form.nivel,
        duracao_estimada_min: form.duracao_estimada_min ? parseInt(form.duracao_estimada_min) : null,
        distancia_estimada_km: form.distancia_estimada_km ? parseFloat(form.distancia_estimada_km) : null,
        intensidade_principal: form.intensidade_principal || null,
        local_sugerido: form.local_sugerido || null,
        tags: tags.length > 0 ? tags : null,
        obrigatorio: form.obrigatorio,
        conta_score_semanal: form.conta_score_semanal,
        conta_missao_semanal: form.conta_missao_semanal,
        data_prevista: form.data_prevista,
        status: 'pendente',
      })
      .select()
      .single()

    if (err || !treino) { setError(err?.message ?? 'Erro ao salvar'); setSaving(false); return }

    if (blocos.length > 0) {
      await supabase.from('treino_aerobico_blocos').insert(
        blocos.map((b, i) => ({
          treino_aerobico_id: treino.id,
          ordem: i + 1,
          tipo_bloco: b.tipo_bloco,
          duracao_min: b.duracao_min ? parseInt(b.duracao_min) : null,
          distancia_km: b.distancia_km ? parseFloat(b.distancia_km) : null,
          velocidade_kmh: b.velocidade_kmh ? parseFloat(b.velocidade_kmh) : null,
          pace_min_km: b.pace_min_km || null,
          zona_fc: b.zona_fc || null,
          pse: b.pse ? parseInt(b.pse) : null,
          inclinacao_pct: b.inclinacao_pct ? parseFloat(b.inclinacao_pct) : null,
          repeticoes: b.repeticoes ? parseInt(b.repeticoes) : null,
          observacao_treinador: b.observacao_treinador || null,
        }))
      )
    }

    router.push(`/alunos/${alunoId}`)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-extrabold text-secondary text-lg mb-4">Configuração</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome do Treino *</label>
            <input className="input" placeholder="Ex: Corrida Regenerativa Z2" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">Modalidade</label>
            <select className="input" value={form.modalidade} onChange={e => setForm(p => ({ ...p, modalidade: e.target.value }))}>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ciclo</label>
            <select className="input" value={form.ciclo_id} onChange={e => setForm(p => ({ ...p, ciclo_id: e.target.value }))}>
              <option value="">Sem ciclo</option>
              {ciclos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data Prevista</label>
            <input type="date" className="input" value={form.data_prevista} onChange={e => setForm(p => ({ ...p, data_prevista: e.target.value }))} />
          </div>
          <div>
            <label className="label">Duração Est. (min)</label>
            <input type="number" className="input" placeholder="45" value={form.duracao_estimada_min} onChange={e => setForm(p => ({ ...p, duracao_estimada_min: e.target.value }))} />
          </div>
          <div>
            <label className="label">Distância Est. (km)</label>
            <input type="number" className="input" placeholder="5.0" step="0.1" value={form.distancia_estimada_km} onChange={e => setForm(p => ({ ...p, distancia_estimada_km: e.target.value }))} />
          </div>
          <div>
            <label className="label">Intensidade Principal</label>
            <input className="input" placeholder="Ex: Z2, moderada" value={form.intensidade_principal} onChange={e => setForm(p => ({ ...p, intensidade_principal: e.target.value }))} />
          </div>
          <div>
            <label className="label">Local Sugerido</label>
            <input className="input" placeholder="Ex: Parque, esteira" value={form.local_sugerido} onChange={e => setForm(p => ({ ...p, local_sugerido: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Objetivo</label>
            <input className="input" placeholder="Ex: desenvolver base aeróbica Z2" value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TAGS.map(t => (
                <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${tags.includes(t) ? 'bg-primary-dark text-white border-primary-dark' : 'bg-white border-outline-variant text-secondary hover:border-primary'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            {[
              { field: 'obrigatorio', label: 'Obrigatório' },
              { field: 'conta_score_semanal', label: 'Conta Score' },
              { field: 'conta_missao_semanal', label: 'Conta Missão' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[field as keyof typeof form] as boolean}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm font-medium text-secondary">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Blocos */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-extrabold text-secondary text-lg">Blocos do Treino</h2>
          <div className="flex gap-1 flex-wrap">
            {TIPOS_BLOCO.map(t => (
              <button key={t.value} onClick={() => addBloco(t.value)} className={`text-xs px-2 py-1 rounded-full font-semibold ${t.color}`}>
                + {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {blocos.map((bloco, i) => {
            const tipoInfo = TIPOS_BLOCO.find(t => t.value === bloco.tipo_bloco)!
            return (
              <div key={bloco.key} className="border border-outline-variant rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-secondary text-white rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tipoInfo.color}`}>{tipoInfo.label}</span>
                  </div>
                  <button onClick={() => removeBloco(bloco.key)} className="text-outline hover:text-error"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Duração (min)</label>
                    <input type="number" className="input text-sm" placeholder="10" value={bloco.duracao_min} onChange={e => updateBloco(bloco.key, 'duracao_min', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Distância (km)</label>
                    <input type="number" className="input text-sm" placeholder="1.5" step="0.1" value={bloco.distancia_km} onChange={e => updateBloco(bloco.key, 'distancia_km', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Pace (min/km)</label>
                    <input className="input text-sm" placeholder="5:30" value={bloco.pace_min_km} onChange={e => updateBloco(bloco.key, 'pace_min_km', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Velocidade (km/h)</label>
                    <input type="number" className="input text-sm" placeholder="10" value={bloco.velocidade_kmh} onChange={e => updateBloco(bloco.key, 'velocidade_kmh', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Zona FC</label>
                    <input className="input text-sm" placeholder="Z2 (60–70%)" value={bloco.zona_fc} onChange={e => updateBloco(bloco.key, 'zona_fc', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">PSE (1–10)</label>
                    <input type="number" min="1" max="10" className="input text-sm" value={bloco.pse} onChange={e => updateBloco(bloco.key, 'pse', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Inclinação (%)</label>
                    <input type="number" className="input text-sm" placeholder="1" value={bloco.inclinacao_pct} onChange={e => updateBloco(bloco.key, 'inclinacao_pct', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Repetições</label>
                    <input type="number" className="input text-sm" placeholder="4" value={bloco.repeticoes} onChange={e => updateBloco(bloco.key, 'repeticoes', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3 col-span-2">
                    <label className="label">Observação</label>
                    <input className="input text-sm" placeholder="Instrução específica deste bloco..." value={bloco.observacao_treinador} onChange={e => updateBloco(bloco.key, 'observacao_treinador', e.target.value)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar Treino Aeróbico'}
        </button>
      </div>
    </div>
  )
}
