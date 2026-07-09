'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'

type Exercicio = { id: string; nome: string; grupo_muscular: string; equipamento: string | null }
type Ciclo = { id: string; nome: string; numero: number; status: string }

type SemanaItem = {
  semana: number
  series: string
  repeticoes: string
  carga_kg: string
}

type ItemForm = {
  key: string
  exercicio_id: string
  nome_livre: string
  ordem: number
  periodizacao: SemanaItem[]
  descanso_seg: string
  observacoes: string
}

interface Props {
  alunoId: string
  ciclos: Ciclo[]
  exercicios: Exercicio[]
}

const DIAS_SEMANA = [
  { value: '', label: 'Sem dia' },
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
]

const DIA_LETRAS = ['', 'A', 'B', 'C', 'D', 'E']

function buildPeriodizacao(numSemanas: number): SemanaItem[] {
  return Array.from({ length: numSemanas }, (_, i) => ({
    semana: i + 1,
    series: '3',
    repeticoes: '10-12',
    carga_kg: '',
  }))
}

function calcSemanas(inicio: string, fim: string): string {
  if (!inicio || !fim) return ''
  const d1 = new Date(inicio)
  const d2 = new Date(fim)
  const diff = d2.getTime() - d1.getTime()
  if (diff <= 0) return ''
  const semanas = Math.round(diff / (1000 * 60 * 60 * 24 * 7))
  return `${semanas} semana${semanas !== 1 ? 's' : ''}`
}

export function NovoTreinoForm({ alunoId, ciclos, exercicios }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Session form
  const [form, setForm] = useState({
    nome: '',
    tipo: 'musculacao' as 'musculacao' | 'aerobico' | 'corrida' | 'hiit',
    ciclo_id: '',
    data: new Date().toISOString().slice(0, 10),
    duracao_min: '',
    intensidade: 'media' as 'baixa' | 'media' | 'alta',
    observacoes: '',
    dia_letra: '',
    dia_semana_numero: '',
  })

  // Ciclo inline creation
  const [novoCiclo, setNovoCiclo] = useState({ nome: '', data_inicio: '', data_fim: '' })
  const showNovoCiclo = form.ciclo_id === '__novo__'

  // Periodization
  const [numSemanas, setNumSemanas] = useState(4)

  // Exercise items
  const [itens, setItens] = useState<ItemForm[]>([])

  // Exercise picker
  const [grupoFilter, setGrupoFilter] = useState('')
  const [search, setSearch] = useState('')

  const grupos = [...new Set(exercicios.map(e => e.grupo_muscular))].sort()
  const exFiltrados = exercicios.filter(e =>
    (!grupoFilter || e.grupo_muscular === grupoFilter) &&
    (!search || e.nome.toLowerCase().includes(search.toLowerCase()))
  )

  function addItem(ex: Exercicio) {
    setItens(prev => [...prev, {
      key: crypto.randomUUID(),
      exercicio_id: ex.id,
      nome_livre: ex.nome,
      ordem: prev.length + 1,
      periodizacao: buildPeriodizacao(numSemanas),
      descanso_seg: '60',
      observacoes: '',
    }])
  }

  function updateItemMeta(key: string, field: 'descanso_seg' | 'observacoes', value: string) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  function updatePeriodizacao(key: string, semana: number, field: keyof Omit<SemanaItem, 'semana'>, value: string) {
    setItens(prev => prev.map(i => {
      if (i.key !== key) return i
      return {
        ...i,
        periodizacao: i.periodizacao.map(p =>
          p.semana === semana ? { ...p, [field]: value } : p
        ),
      }
    }))
  }

  function removeItem(key: string) {
    setItens(prev => prev.filter(i => i.key !== key))
  }

  // When numSemanas changes, adjust all items' periodizacao
  function handleNumSemanasChange(n: number) {
    setNumSemanas(n)
    setItens(prev => prev.map(item => {
      const current = item.periodizacao
      if (n > current.length) {
        // Append new weeks
        const extra: SemanaItem[] = Array.from({ length: n - current.length }, (_, i) => ({
          semana: current.length + i + 1,
          series: '3',
          repeticoes: '10-12',
          carga_kg: '',
        }))
        return { ...item, periodizacao: [...current, ...extra] }
      } else {
        return { ...item, periodizacao: current.slice(0, n) }
      }
    }))
  }

  async function handleSave() {
    if (!form.nome) { setError('Informe um nome para o treino'); return }
    if (showNovoCiclo && !novoCiclo.nome) { setError('Informe o nome do novo ciclo'); return }
    setSaving(true)
    setError('')

    let cicloId: string | null = form.ciclo_id || null

    // Create ciclo inline if needed
    if (showNovoCiclo) {
      const { data: cicloData, error: cicloErr } = await supabase
        .from('ciclos')
        .insert({
          aluno_id: alunoId,
          nome: novoCiclo.nome,
          data_inicio: novoCiclo.data_inicio || null,
          data_fim: novoCiclo.data_fim || null,
          numero: ciclos.length + 1,
          status: 'ativo',
        })
        .select()
        .single()

      if (cicloErr || !cicloData) {
        setError(cicloErr?.message ?? 'Erro ao criar ciclo')
        setSaving(false)
        return
      }
      cicloId = cicloData.id
    }

    const { data: sessao, error: sessaoErr } = await supabase
      .from('sessoes_treino')
      .insert({
        aluno_id: alunoId,
        ciclo_id: cicloId,
        nome: form.nome,
        tipo: form.tipo,
        data: form.data,
        duracao_min: form.duracao_min ? parseInt(form.duracao_min) : null,
        intensidade: form.intensidade,
        observacoes: form.observacoes || null,
        status: 'pendente',
        dia_letra: form.dia_letra || null,
        dia_semana_numero: form.dia_semana_numero !== '' ? parseInt(form.dia_semana_numero) : null,
      })
      .select()
      .single()

    if (sessaoErr || !sessao) { setError(sessaoErr?.message ?? 'Erro ao salvar'); setSaving(false); return }

    if (itens.length > 0) {
      await supabase.from('sessao_itens').insert(
        itens.map((item, i) => {
          const semana1 = item.periodizacao[0]
          return {
            sessao_id: sessao.id,
            exercicio_id: item.exercicio_id || null,
            nome_livre: item.nome_livre || null,
            ordem: i + 1,
            series: semana1?.series ? parseInt(semana1.series) : null,
            repeticoes: semana1?.repeticoes || null,
            carga_kg: semana1?.carga_kg ? parseFloat(semana1.carga_kg) : null,
            descanso_seg: item.descanso_seg ? parseInt(item.descanso_seg) : null,
            observacoes: item.observacoes || null,
            periodizacao_semanal: item.periodizacao.map(p => ({
              semana: p.semana,
              series: p.series ? parseInt(p.series) : null,
              repeticoes: p.repeticoes || null,
              carga_kg: p.carga_kg ? parseFloat(p.carga_kg) : null,
            })),
          }
        })
      )
    }

    router.push(`/alunos/${alunoId}`)
  }

  const semanasDuration = calcSemanas(novoCiclo.data_inicio, novoCiclo.data_fim)

  return (
    <div className="space-y-6">
      {/* Sessão base */}
      <div className="card">
        <h2 className="font-extrabold text-secondary text-lg mb-4">Configuração do Treino</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome do Treino *</label>
            <input
              className="input"
              placeholder="Ex: Musculação – Superior A"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as any }))}>
              <option value="musculacao">Musculação</option>
              <option value="aerobico">Aeróbico</option>
              <option value="corrida">Corrida</option>
              <option value="hiit">HIIT</option>
            </select>
          </div>

          {/* Ciclo select with inline creation */}
          <div>
            <label className="label">Ciclo</label>
            <select
              className="input"
              value={form.ciclo_id}
              onChange={e => setForm(p => ({ ...p, ciclo_id: e.target.value }))}
            >
              <option value="">Sem ciclo</option>
              {ciclos.map(c => (
                <option key={c.id} value={c.id}>{c.nome} (#{c.numero})</option>
              ))}
              <option value="__novo__">+ Criar novo ciclo</option>
            </select>
          </div>

          {/* Inline new ciclo fields */}
          {showNovoCiclo && (
            <div className="sm:col-span-2 bg-background rounded-xl p-4 border border-outline-variant space-y-3">
              <p className="text-sm font-semibold text-secondary">Novo Ciclo</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Nome do ciclo *</label>
                  <input
                    className="input"
                    placeholder="Ex: Ciclo Hipertrofia"
                    value={novoCiclo.nome}
                    onChange={e => setNovoCiclo(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Data início</label>
                  <input
                    type="date"
                    className="input"
                    value={novoCiclo.data_inicio}
                    onChange={e => setNovoCiclo(p => ({ ...p, data_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">
                    Data fim
                    {semanasDuration && (
                      <span className="ml-2 text-primary font-bold">{semanasDuration}</span>
                    )}
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={novoCiclo.data_fim}
                    onChange={e => setNovoCiclo(p => ({ ...p, data_fim: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dia letra + dia semana */}
          <div>
            <label className="label">Dia Letra</label>
            <select
              className="input"
              value={form.dia_letra}
              onChange={e => setForm(p => ({ ...p, dia_letra: e.target.value }))}
            >
              {DIA_LETRAS.map(l => (
                <option key={l} value={l}>{l === '' ? 'Sem letra' : `Dia ${l}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Dia da Semana</label>
            <select
              className="input"
              value={form.dia_semana_numero}
              onChange={e => setForm(p => ({ ...p, dia_semana_numero: e.target.value }))}
            >
              {DIAS_SEMANA.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Data</label>
            <input
              type="date"
              className="input"
              value={form.data}
              onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Duração estimada (min)</label>
            <input
              type="number"
              className="input"
              placeholder="60"
              value={form.duracao_min}
              onChange={e => setForm(p => ({ ...p, duracao_min: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Intensidade</label>
            <select className="input" value={form.intensidade} onChange={e => setForm(p => ({ ...p, intensidade: e.target.value as any }))}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          {/* Num semanas periodization */}
          <div>
            <label className="label">Semanas de periodização</label>
            <select
              className="input"
              value={numSemanas}
              onChange={e => handleNumSemanasChange(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} semana{n !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Instruções gerais para este treino..."
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Exercícios selecionados */}
      {itens.length > 0 && (
        <div className="card">
          <h3 className="font-extrabold text-secondary mb-4">Exercícios do Treino ({itens.length})</h3>
          <div className="space-y-4">
            {itens.map((item, i) => (
              <div key={item.key} className="bg-background rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <GripVertical size={16} className="text-outline cursor-move" />
                  <span className="w-6 h-6 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="font-semibold text-secondary flex-1">{item.nome_livre}</p>
                  <button onClick={() => removeItem(item.key)} className="text-outline hover:text-error">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Periodization table */}
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-outline pb-2 pr-3 min-w-[80px]"></th>
                        {item.periodizacao.map(p => (
                          <th key={p.semana} className="text-center text-xs font-semibold text-outline pb-2 px-1 min-w-[72px]">
                            Sem. {p.semana}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Series row */}
                      <tr>
                        <td className="text-xs font-semibold text-secondary py-1 pr-3">Séries</td>
                        {item.periodizacao.map(p => (
                          <td key={p.semana} className="px-1 py-1">
                            <input
                              type="number"
                              className="input text-xs text-center px-1 py-1"
                              placeholder="3"
                              value={p.series}
                              onChange={e => updatePeriodizacao(item.key, p.semana, 'series', e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                      {/* Reps row */}
                      <tr>
                        <td className="text-xs font-semibold text-secondary py-1 pr-3">Repetições</td>
                        {item.periodizacao.map(p => (
                          <td key={p.semana} className="px-1 py-1">
                            <input
                              className="input text-xs text-center px-1 py-1"
                              placeholder="10-12"
                              value={p.repeticoes}
                              onChange={e => updatePeriodizacao(item.key, p.semana, 'repeticoes', e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                      {/* Carga row */}
                      <tr>
                        <td className="text-xs font-semibold text-secondary py-1 pr-3">Carga (kg)</td>
                        {item.periodizacao.map(p => (
                          <td key={p.semana} className="px-1 py-1">
                            <input
                              type="number"
                              className="input text-xs text-center px-1 py-1"
                              placeholder="—"
                              value={p.carga_kg}
                              onChange={e => updatePeriodizacao(item.key, p.semana, 'carga_kg', e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Descanso + observação */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Descanso (seg)</label>
                    <input
                      type="number"
                      className="input text-sm"
                      placeholder="60"
                      value={item.descanso_seg}
                      onChange={e => updateItemMeta(item.key, 'descanso_seg', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Observação</label>
                    <input
                      className="input text-sm"
                      placeholder="Dica de execução..."
                      value={item.observacoes}
                      onChange={e => updateItemMeta(item.key, 'observacoes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise picker */}
      <div className="card">
        <h3 className="font-extrabold text-secondary mb-4">Adicionar Exercício</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <input
              className="input pl-4 text-sm"
              placeholder="Buscar exercício..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setGrupoFilter('')}
              className={`px-2 py-1 text-xs rounded-full font-semibold ${!grupoFilter ? 'bg-secondary text-white' : 'bg-white border border-outline-variant text-secondary'}`}
            >
              Todos
            </button>
            {grupos.map(g => (
              <button
                key={g}
                onClick={() => setGrupoFilter(g === grupoFilter ? '' : g)}
                className={`px-2 py-1 text-xs rounded-full font-semibold ${grupoFilter === g ? 'bg-secondary text-white' : 'bg-white border border-outline-variant text-secondary'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {exFiltrados.map(ex => {
            const alreadyAdded = itens.some(i => i.exercicio_id === ex.id)
            return (
              <button
                key={ex.id}
                onClick={() => !alreadyAdded && addItem(ex)}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                  alreadyAdded
                    ? 'bg-green-50 border-green-200 cursor-default'
                    : 'bg-white border-outline-variant hover:border-primary hover:bg-blue-50'
                }`}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-primary">
                  {ex.grupo_muscular.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-secondary truncate">{ex.nome}</p>
                  <p className="text-[10px] text-outline">{ex.grupo_muscular}</p>
                </div>
                {alreadyAdded ? (
                  <span className="text-xs text-green-600">&#10003;</span>
                ) : (
                  <Plus size={14} className="text-primary flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar Treino'}
        </button>
      </div>
    </div>
  )
}
