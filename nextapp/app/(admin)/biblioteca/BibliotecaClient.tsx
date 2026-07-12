'use client'

import { useState } from 'react'
import { Plus, Search, Play, ChevronDown, X, Loader2, Edit2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Exercicio = {
  id: string
  nome: string
  grupo_muscular: string
  categoria: string
  instrucoes: string | null
  video_url: string | null
  equipamento: string | null
  erros_comuns: string | null
  ativo: boolean
  criado_em: string
  exercicio_substituto_id: string | null
  musculo_primario: string | null
  musculo_secundario: string | null
  musculo_terciario: string | null
  series_secundario: number | null
  series_terciario: number | null
}

const GRUPOS = [
  'Peito', 'Costas', 'Ombros', 'Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior',
  'Bíceps', 'Tríceps', 'Antebraço', 'Trapézio',
  'Quadríceps', 'Posterior de coxa', 'Glúteo', 'Glúteo médio', 'Panturrilha',
  'Core', 'Cardio', 'Funcional',
]

function getYoutubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&?\s/]+)/)
  return m ? m[1] : null
}

function ExercicioForm({ f, setF, allExercicios, excludeId }: {
  f: FormState
  setF: (fn: (p: FormState) => FormState) => void
  allExercicios: Exercicio[]
  excludeId?: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" placeholder="Ex: Supino Reto com Barra" value={f.nome} onChange={e => setF(p => ({ ...p, nome: e.target.value }))} />
      </div>
      <div>
        <label className="label">Grupo Muscular *</label>
        <input list="grupos-list" className="input" placeholder="Ex: Peito" value={f.grupo_muscular} onChange={e => setF(p => ({ ...p, grupo_muscular: e.target.value, musculo_primario: p.musculo_primario || e.target.value }))} />
        <datalist id="grupos-list">{GRUPOS.map(g => <option key={g} value={g} />)}</datalist>
      </div>
      <div>
        <label className="label">Categoria</label>
        <select className="input" value={f.categoria} onChange={e => setF(p => ({ ...p, categoria: e.target.value }))}>
          <option value="musculacao">Musculação</option>
          <option value="cardio">Cardio</option>
          <option value="funcional">Funcional</option>
          <option value="mobilidade">Mobilidade</option>
        </select>
      </div>
      <div>
        <label className="label">Equipamento</label>
        <input className="input" placeholder="Ex: Barra, Halter 20kg" value={f.equipamento} onChange={e => setF(p => ({ ...p, equipamento: e.target.value }))} />
      </div>
      <div>
        <label className="label">URL do Vídeo</label>
        <input className="input" placeholder="https://youtube.com/..." value={f.video_url} onChange={e => setF(p => ({ ...p, video_url: e.target.value }))} />
      </div>
      <div>
        <label className="label">Erros Comuns</label>
        <input className="input" placeholder="Ex: colocar as mãos muito fechadas" value={f.erros_comuns} onChange={e => setF(p => ({ ...p, erros_comuns: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Instruções de Execução</label>
        <textarea className="input min-h-[80px]" placeholder="Passo a passo da execução correta..." value={f.instrucoes} onChange={e => setF(p => ({ ...p, instrucoes: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Exercício Substituto</label>
        <select className="input" value={f.exercicio_substituto_id} onChange={e => setF(p => ({ ...p, exercicio_substituto_id: e.target.value }))}>
          <option value="">— Nenhum —</option>
          {[...allExercicios].filter(e => e.id !== excludeId).sort((a, b) => a.nome.localeCompare(b.nome)).map(ex => (
            <option key={ex.id} value={ex.id}>{ex.nome} ({ex.grupo_muscular})</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 border border-outline-variant rounded-lg p-3 space-y-3">
        <p className="text-xs font-semibold text-outline uppercase tracking-wider">Músculos trabalhados (para relatório de volume)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Músculo Primário (1 série)</label>
            <input list="grupos-list-pri" className="input" placeholder="Ex: Peito" value={f.musculo_primario} onChange={e => setF(p => ({ ...p, musculo_primario: e.target.value }))} />
            <datalist id="grupos-list-pri">{GRUPOS.map(g => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <label className="label">Músculo Secundário</label>
            <input list="grupos-list-sec" className="input" placeholder="Ex: Deltoide anterior" value={f.musculo_secundario} onChange={e => setF(p => ({ ...p, musculo_secundario: e.target.value }))} />
            <datalist id="grupos-list-sec">{GRUPOS.map(g => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <label className="label">Músculo Terciário</label>
            <input list="grupos-list-ter" className="input" placeholder="Ex: Tríceps" value={f.musculo_terciario} onChange={e => setF(p => ({ ...p, musculo_terciario: e.target.value }))} />
            <datalist id="grupos-list-ter">{GRUPOS.map(g => <option key={g} value={g} />)}</datalist>
          </div>
        </div>
        {(f.musculo_secundario || f.musculo_terciario) && (
          <div className="grid grid-cols-2 gap-3">
            {f.musculo_secundario && (
              <div>
                <label className="label">Peso séries — {f.musculo_secundario}</label>
                <select className="input" value={f.series_secundario} onChange={e => setF(p => ({ ...p, series_secundario: e.target.value }))}>
                  <option value="0.25">0,25 séries</option>
                  <option value="0.5">0,5 séries</option>
                  <option value="0.75">0,75 séries</option>
                  <option value="1">1 série</option>
                </select>
              </div>
            )}
            {f.musculo_terciario && (
              <div>
                <label className="label">Peso séries — {f.musculo_terciario}</label>
                <select className="input" value={f.series_terciario} onChange={e => setF(p => ({ ...p, series_terciario: e.target.value }))}>
                  <option value="0.25">0,25 séries</option>
                  <option value="0.5">0,5 séries</option>
                  <option value="0.75">0,75 séries</option>
                  <option value="1">1 série</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type FormState = {
  nome: string
  grupo_muscular: string
  categoria: string
  instrucoes: string
  video_url: string
  equipamento: string
  erros_comuns: string
  exercicio_substituto_id: string
  musculo_primario: string
  musculo_secundario: string
  musculo_terciario: string
  series_secundario: string
  series_terciario: string
}

const emptyForm = (): FormState => ({
  nome: '', grupo_muscular: '', categoria: 'musculacao', instrucoes: '',
  video_url: '', equipamento: '', erros_comuns: '', exercicio_substituto_id: '',
  musculo_primario: '', musculo_secundario: '', musculo_terciario: '',
  series_secundario: '0.5', series_terciario: '0.5',
})

export function BibliotecaClient({ exercicios: initial }: { exercicios: Exercicio[] }) {
  const supabase = createClient()
  const [exercicios, setExercicios] = useState(initial)
  const [search, setSearch] = useState('')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editForm, setEditForm] = useState<FormState>(emptyForm())

  const filtrados = exercicios.filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.grupo_muscular.toLowerCase().includes(search.toLowerCase())
    const matchGrupo = !grupoFilter || e.grupo_muscular === grupoFilter
    return matchSearch && matchGrupo
  })

  const grupos = [...new Set(exercicios.map(e => e.grupo_muscular))].sort()

  function toDbPayload(f: FormState) {
    return {
      nome: f.nome,
      grupo_muscular: f.grupo_muscular,
      categoria: f.categoria,
      instrucoes: f.instrucoes || null,
      video_url: f.video_url || null,
      equipamento: f.equipamento || null,
      erros_comuns: f.erros_comuns || null,
      exercicio_substituto_id: f.exercicio_substituto_id || null,
      musculo_primario: f.musculo_primario || f.grupo_muscular || null,
      musculo_secundario: f.musculo_secundario || null,
      musculo_terciario: f.musculo_terciario || null,
      series_secundario: f.musculo_secundario ? (parseFloat(f.series_secundario) || 0.5) : null,
      series_terciario: f.musculo_terciario ? (parseFloat(f.series_terciario) || 0.5) : null,
    }
  }

  async function saveExercicio() {
    if (!form.nome || !form.grupo_muscular) return
    setSaving(true)
    const { data } = await supabase.from('exercicios').insert(toDbPayload(form)).select().single()
    if (data) {
      setExercicios(prev => [data, ...prev])
      setForm(emptyForm())
      setShowForm(false)
    }
    setSaving(false)
  }

  function startEdit(ex: Exercicio) {
    setEditingId(ex.id)
    setEditForm({
      nome: ex.nome,
      grupo_muscular: ex.grupo_muscular,
      categoria: ex.categoria,
      instrucoes: ex.instrucoes || '',
      video_url: ex.video_url || '',
      equipamento: ex.equipamento || '',
      erros_comuns: ex.erros_comuns || '',
      exercicio_substituto_id: ex.exercicio_substituto_id || '',
      musculo_primario: ex.musculo_primario || ex.grupo_muscular,
      musculo_secundario: ex.musculo_secundario || '',
      musculo_terciario: ex.musculo_terciario || '',
      series_secundario: String(ex.series_secundario ?? 0.5),
      series_terciario: String(ex.series_terciario ?? 0.5),
    })
  }

  async function saveEdit(id: string) {
    if (!editForm.nome || !editForm.grupo_muscular) return
    setEditSaving(true)
    const { data } = await supabase.from('exercicios').update(toDbPayload(editForm)).eq('id', id).select().single()
    if (data) {
      setExercicios(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  async function deleteExercicio(id: string) {
    if (!confirm('Excluir exercício?')) return
    const { error } = await supabase.from('exercicios').delete().eq('id', id)
    if (!error) {
      setExercicios(prev => prev.filter(e => e.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input className="input pl-9" placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setGrupoFilter('')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${!grupoFilter ? 'bg-secondary text-white' : 'bg-white border border-outline-variant text-secondary'}`}>Todos</button>
          {grupos.map(g => (
            <button key={g} onClick={() => setGrupoFilter(g === grupoFilter ? '' : g)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${grupoFilter === g ? 'bg-secondary text-white' : 'bg-white border border-outline-variant text-secondary'}`}>{g}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 py-2 ml-auto">
          <Plus size={16} /> Novo Exercício
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-primary">
          <h3 className="font-extrabold text-secondary mb-4">Novo Exercício</h3>
          <ExercicioForm f={form} setF={setForm} allExercicios={exercicios} />
          <div className="flex gap-3 mt-4">
            <button onClick={saveExercicio} disabled={saving || !form.nome || !form.grupo_muscular} className="btn-primary text-sm px-6">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtrados.map(ex => {
          const ytId = getYoutubeId(ex.video_url)
          const substituto = ex.exercicio_substituto_id
            ? exercicios.find(e => e.id === ex.exercicio_substituto_id)
            : null

          return (
            <div key={ex.id} className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="w-full flex items-center gap-4 p-4 text-left">
                {ytId ? (
                  <img
                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                    alt={ex.nome}
                    width={80}
                    height={56}
                    className="rounded-lg object-cover flex-shrink-0"
                    style={{ width: 80, height: 56 }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                    <span className="text-sm font-extrabold">{ex.grupo_muscular.slice(0, 2).toUpperCase()}</span>
                  </div>
                )}

                <button
                  className="flex-1 min-w-0 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === ex.id ? null : ex.id)}
                >
                  <p className="font-semibold text-secondary">{ex.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-outline">{ex.grupo_muscular}</span>
                    {ex.equipamento && <span className="text-xs text-outline">· {ex.equipamento}</span>}
                    {ex.musculo_secundario && (
                      <span className="text-xs text-outline bg-gray-50 px-1.5 py-0.5 rounded">+ {ex.musculo_secundario}</span>
                    )}
                  </div>
                </button>

                {ex.video_url && (
                  <span className="text-xs text-primary flex items-center gap-1 flex-shrink-0">
                    <Play size={12} /> Vídeo
                  </span>
                )}

                <button
                  onClick={e => { e.stopPropagation(); startEdit(ex); setExpanded(ex.id) }}
                  className="p-1 text-outline hover:text-secondary transition-colors flex-shrink-0"
                  title="Editar"
                >
                  <Edit2 size={15} />
                </button>

                <button
                  onClick={e => { e.stopPropagation(); deleteExercicio(ex.id) }}
                  className="p-1 text-outline hover:text-red-500 transition-colors flex-shrink-0"
                  title="Excluir"
                >
                  <Trash2 size={15} />
                </button>

                <button onClick={() => setExpanded(expanded === ex.id ? null : ex.id)} className="flex-shrink-0">
                  <ChevronDown size={16} className={`text-outline transition-transform ${expanded === ex.id ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {expanded === ex.id && (
                <div className="px-4 pb-4 border-t border-outline-variant">
                  {editingId === ex.id ? (
                    <div className="mt-4">
                      <h4 className="font-extrabold text-secondary mb-3">Editar Exercício</h4>
                      <ExercicioForm f={editForm} setF={setEditForm} allExercicios={exercicios} excludeId={ex.id} />
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => saveEdit(ex.id)} disabled={editSaving || !editForm.nome || !editForm.grupo_muscular} className="btn-primary text-sm px-6">
                          {editSaving ? <Loader2 size={14} className="animate-spin" /> : null} Salvar
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-sm">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {ex.instrucoes && (
                          <div>
                            <p className="label">Instruções</p>
                            <p className="text-sm text-secondary">{ex.instrucoes}</p>
                          </div>
                        )}
                        {ex.erros_comuns && (
                          <div>
                            <p className="label">Erros Comuns</p>
                            <p className="text-sm text-secondary">{ex.erros_comuns}</p>
                          </div>
                        )}
                        {substituto && (
                          <div>
                            <p className="label">Substituto</p>
                            <p className="text-sm text-secondary">{substituto.nome}</p>
                          </div>
                        )}
                        {(ex.musculo_primario || ex.musculo_secundario) && (
                          <div>
                            <p className="label">Músculos</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ex.musculo_primario && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{ex.musculo_primario} (1×)</span>}
                              {ex.musculo_secundario && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{ex.musculo_secundario} ({ex.series_secundario}×)</span>}
                              {ex.musculo_terciario && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{ex.musculo_terciario} ({ex.series_terciario}×)</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {ex.video_url && (
                        ytId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            className="w-full rounded-lg mt-3"
                            style={{ aspectRatio: '16/9' }}
                            allowFullScreen
                          />
                        ) : (
                          <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm px-4 py-2 mt-3 inline-flex">
                            <Play size={14} /> Assistir vídeo
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <div className="text-center py-16 text-outline">
            <p className="font-semibold">Nenhum exercício encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
