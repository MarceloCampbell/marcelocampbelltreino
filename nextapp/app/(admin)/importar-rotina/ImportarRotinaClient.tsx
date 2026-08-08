'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, Upload, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseRoutine, assignBisetGroups, diaSemanaToNum } from '@/lib/routineParser'
import type { RoutineRow } from '@/lib/routineParser'

// ── Types ────────────────────────────────────────────────────────────────────

interface Aluno { id: string; nome: string }

interface Sugestao { id: string; nome: string; grupo_muscular: string }

interface ConflictItem {
  inputName: string
  suggestions: Sugestao[]
  resolution: 'existing' | 'new' | 'ignore'
  selectedId?: string
  newNome?: string
  newGrupo?: string
}

interface ResolvedEntry {
  exercicioId: string | null
  exercicioNome: string | null
  isAutoResolved: boolean
  isNew: boolean
  isIgnored: boolean
}

interface SuccessResult {
  cicloNome: string
  sessoes: number
  itens: number
  newMappings: number
}

type Step = 'entrada' | 'analisando' | 'revisao' | 'resumo' | 'importando' | 'sucesso'

const GRUPOS = [
  'Abdômen', 'Bíceps', 'Coxas', 'Deltoide anterior', 'Deltoide lateral',
  'Deltoide posterior', 'Glúteos', 'Isquiotibiais', 'Lombar', 'Panturrilha',
  'Peitoral', 'Quadríceps', 'Trapézio', 'Tríceps', 'Costas', 'Outros',
]

const TEMPLATE = `# ROTINA: Nome da Rotina
# ALUNO: Nome do Aluno
# OBJETIVO: Hipertrofia
# NIVEL: Intermediário
# INICIO: 01/08/2026
# TERMINO: 25/10/2026

TREINO | DIA_SEMANA | EXERCICIO            | SERIES | REPS   | CARGA  | INTERVALO | COMBINADO_COM | INSTRUCOES
A      | Segunda    | Agachamento Livre    | 4      | 8-10   | 60kg   | 120s      |               |
A      | Segunda    | Leg Press 45         | 3      | 12     | 150kg  | 90s       |               |
A      | Segunda    | Rosca Direta         | 3      | 10-12  |        | 60s       | Tríceps Testa | Supinar no topo
A      | Segunda    | Tríceps Testa        | 3      | 10-12  |        | 60s       | Rosca Direta  |
B      | Quarta     | Supino Reto          | 4      | 8      | 40kg   | 120s      |               |
`

// ── helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string) { return s.toLowerCase().trim() }

// ── Component ────────────────────────────────────────────────────────────────

export function ImportarRotinaClient({ alunos }: { alunos: Aluno[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('entrada')
  const [error, setError] = useState('')

  // Entrada state
  const [texto, setTexto] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [cicloNome, setCicloNome] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Analysis results
  const [parsedRows, setParsedRows] = useState<RoutineRow[]>([])
  const [treinoLetras, setTreinoLetras] = useState<string[]>([])
  const [resolvedMap, setResolvedMap] = useState<Map<string, ResolvedEntry>>(new Map())
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])

  // Success
  const [result, setResult] = useState<SuccessResult | null>(null)

  // ── Step 1: Analisar ──────────────────────────────────────────────────────

  async function handleAnalisar() {
    setError('')
    if (!texto.trim()) { setError('Cole o texto da rotina.'); return }
    if (!alunoId) { setError('Selecione um aluno.'); return }

    setStep('analisando')

    try {
      const routine = parseRoutine(texto)

      // Override cicloNome/datas from form if set (form takes precedence)
      const nomeCiclo = cicloNome.trim() || routine.nome
      const inicio = dataInicio || routine.dataInicio || new Date().toISOString().slice(0, 10)
      const fim = dataFim || routine.dataFim || ''

      setCicloNome(nomeCiclo)
      setDataInicio(inicio)
      setDataFim(fim)
      setParsedRows(routine.rows)
      setTreinoLetras(routine.treinoLetras)

      // Auto-fill aluno from template name if nothing selected
      const uniqueNames = [...new Set(routine.rows.map(r => normalize(r.exercicio)))]

      // Fetch ALL name mappings (small table)
      const { data: mappings } = await supabase
        .from('exercise_name_mappings')
        .select('input_name, exercise_id, exercicio:exercicios(id, nome)')

      const mappingMap = new Map<string, { id: string; nome: string }>()
      for (const m of mappings ?? []) {
        const ex = (m.exercicio as any)
        if (ex) mappingMap.set(normalize(m.input_name), { id: ex.id, nome: ex.nome })
      }

      // Classify each unique name
      const resolved = new Map<string, ResolvedEntry>()
      const toResolve: string[] = []

      for (const name of uniqueNames) {
        const match = mappingMap.get(normalize(name))
        if (match) {
          resolved.set(name, {
            exercicioId: match.id,
            exercicioNome: match.nome,
            isAutoResolved: true,
            isNew: false,
            isIgnored: false,
          })
        } else {
          toResolve.push(name)
        }
      }

      // For unresolved: fetch suggestions (3 per exercise)
      const conflictItems: ConflictItem[] = []
      for (const name of toResolve) {
        const keyword = name.split(' ')[0]
        const { data: suggestions } = await supabase
          .from('exercicios')
          .select('id, nome, grupo_muscular')
          .ilike('nome', `%${keyword}%`)
          .eq('ativo', true)
          .limit(6)

        const suggs = (suggestions ?? []) as Sugestao[]
        conflictItems.push({
          inputName: name,
          suggestions: suggs,
          resolution: suggs.length > 0 ? 'existing' : 'new',
          selectedId: suggs[0]?.id,
          newNome: name,
          newGrupo: 'Outros',
        })
      }

      setResolvedMap(resolved)
      setConflicts(conflictItems)

      if (conflictItems.length === 0) {
        setStep('resumo')
      } else {
        setStep('revisao')
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao analisar rotina.')
      setStep('entrada')
    }
  }

  // ── Step 2: Confirmar conflitos ───────────────────────────────────────────

  function updateConflict(index: number, patch: Partial<ConflictItem>) {
    setConflicts(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c))
  }

  function handleConfirmarConflitos() {
    // Validate: all conflicts must have a valid resolution
    for (const c of conflicts) {
      if (c.resolution === 'existing' && !c.selectedId) {
        setError(`Selecione um exercício para "${c.inputName}".`); return
      }
      if (c.resolution === 'new' && !c.newNome?.trim()) {
        setError(`Informe o nome para o novo exercício "${c.inputName}".`); return
      }
    }
    setError('')

    // Build entries for the resolved map
    const updated = new Map(resolvedMap)
    for (const c of conflicts) {
      if (c.resolution === 'ignore') {
        updated.set(c.inputName, { exercicioId: null, exercicioNome: null, isAutoResolved: false, isNew: false, isIgnored: true })
      } else if (c.resolution === 'new') {
        updated.set(c.inputName, { exercicioId: null, exercicioNome: c.newNome!, isAutoResolved: false, isNew: true, isIgnored: false })
      } else {
        const sug = conflicts.find(x => x.inputName === c.inputName)?.suggestions.find(s => s.id === c.selectedId)
        updated.set(c.inputName, { exercicioId: c.selectedId!, exercicioNome: sug?.nome ?? c.inputName, isAutoResolved: false, isNew: false, isIgnored: false })
      }
    }
    setResolvedMap(updated)
    setStep('resumo')
  }

  // ── Step 3: Import ────────────────────────────────────────────────────────

  async function handleImportar() {
    setError('')
    setStep('importando')

    try {
      // 1. Create new exercises
      const newExIds = new Map<string, string>()
      for (const c of conflicts.filter(x => x.resolution === 'new')) {
        const { data: ex, error: exErr } = await supabase
          .from('exercicios')
          .insert({ nome: c.newNome!.trim(), grupo_muscular: c.newGrupo ?? 'Outros', categoria: 'musculacao', ativo: true } as any)
          .select('id')
          .single()
        if (exErr || !ex) throw new Error(`Erro ao criar exercício "${c.newNome}": ${exErr?.message}`)
        newExIds.set(c.inputName, (ex as any).id)
      }

      // 2. Build final exercise id map
      const getExercicioId = (inputName: string): string | null => {
        const entry = resolvedMap.get(inputName)
        if (!entry || entry.isIgnored) return null
        if (entry.isNew) return newExIds.get(inputName) ?? null
        return entry.exercicioId
      }

      // 3. Create ciclo
      const { data: ciclo, error: cicloErr } = await supabase
        .from('ciclos')
        .insert({
          aluno_id: alunoId,
          nome: cicloNome,
          numero: 1,
          semana_atual: 1,
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
          status: 'ativo',
        } as any)
        .select('id')
        .single()
      if (cicloErr || !ciclo) throw new Error(cicloErr?.message ?? 'Erro ao criar ciclo')
      const cicloId = (ciclo as any).id as string

      let totalItens = 0

      // 4. For each treino letter: create sessao + itens
      for (let ordem = 0; ordem < treinoLetras.length; ordem++) {
        const letra = treinoLetras[ordem]
        const rows = parsedRows.filter(r => r.treino === letra)
        if (rows.length === 0) continue

        const diaSemana = rows[0].diaSemana
        const diaSemanaNum = diaSemanaToNum(diaSemana)

        const { data: sessao, error: sessaoErr } = await supabase
          .from('sessoes_treino')
          .insert({
            aluno_id: alunoId,
            ciclo_id: cicloId,
            nome: `Treino ${letra}`,
            tipo: 'musculacao',
            dia_letra: letra,
            dia_semana_numero: diaSemanaNum,
            status: 'pendente',
            ordem,
            data: dataInicio || new Date().toISOString().slice(0, 10),
          } as any)
          .select('id')
          .single()
        if (sessaoErr || !sessao) throw new Error(sessaoErr?.message ?? 'Erro ao criar sessão')
        const sessaoId = (sessao as any).id as string

        const bisets = assignBisetGroups(rows, letra)

        const itens = rows
          .map((row, i) => {
            const exercicioId = getExercicioId(row.exercicio)
            const entry = resolvedMap.get(row.exercicio)
            if (entry?.isIgnored) return null

            let obs = row.instrucoes || null
            if (row.carga && !row.cargaKg && row.carga.toLowerCase() !== 'sem carga') {
              obs = obs ? `${obs} — Carga: ${row.carga}` : `Carga: ${row.carga}`
            }

            return {
              sessao_id: sessaoId,
              exercicio_id: exercicioId,
              nome_livre: exercicioId ? null : (entry?.exercicioNome ?? row.exercicio),
              ordem: i + 1,
              series: row.series,
              repeticoes: row.reps || null,
              carga_kg: row.cargaKg,
              descanso_seg: row.intervaloSeg,
              observacoes: obs,
              biset_grupo: bisets[i] ?? null,
            }
          })
          .filter(Boolean)

        if (itens.length > 0) {
          const { error: itensErr } = await supabase.from('sessao_itens').insert(itens as any)
          if (itensErr) throw new Error(itensErr.message)
          totalItens += itens.length
        }
      }

      // 5. Save new mappings
      const newMappingRows = conflicts
        .filter(c => c.resolution !== 'ignore')
        .map(c => {
          const exId = c.resolution === 'new'
            ? newExIds.get(c.inputName)
            : c.selectedId
          if (!exId) return null
          return { input_name: c.inputName, exercise_id: exId, confirmed_by: 'admin' }
        })
        .filter(Boolean)

      if (newMappingRows.length > 0) {
        await supabase
          .from('exercise_name_mappings')
          .upsert(newMappingRows as any, { onConflict: 'input_name', ignoreDuplicates: true })
      }

      setResult({
        cicloNome,
        sessoes: treinoLetras.length,
        itens: totalItens,
        newMappings: newMappingRows.length,
      })
      setStep('sucesso')
    } catch (e: any) {
      setError(e.message ?? 'Erro durante a importação.')
      setStep('resumo')
    }
  }

  function resetAll() {
    setStep('entrada')
    setTexto('')
    setAlunoId('')
    setCicloNome('')
    setDataInicio('')
    setDataFim('')
    setParsedRows([])
    setTreinoLetras([])
    setResolvedMap(new Map())
    setConflicts([])
    setResult(null)
    setError('')
  }

  // ── Summary helpers ───────────────────────────────────────────────────────

  const autoCount = [...resolvedMap.values()].filter(e => e.isAutoResolved).length
  const manualCount = conflicts.filter(c => c.resolution === 'existing').length
  const newCount = conflicts.filter(c => c.resolution === 'new').length
  const ignoredCount = conflicts.filter(c => c.resolution === 'ignore').length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Entrada ── */}
      {(step === 'entrada' || step === 'analisando') && (
        <>
          <div className="card space-y-4">
            <h2 className="font-extrabold text-secondary text-lg">1. Configuração</h2>

            <div>
              <label className="label">Aluno *</label>
              <select
                className="input"
                value={alunoId}
                onChange={e => setAlunoId(e.target.value)}
              >
                <option value="">Selecionar aluno...</option>
                {alunos.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="label">Nome do Ciclo</label>
                <input
                  className="input"
                  placeholder="Auto do template"
                  value={cicloNome}
                  onChange={e => setCicloNome(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Data Início</label>
                <input type="date" className="input" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input type="date" className="input" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-secondary text-lg">2. Template da Rotina</h2>
              <button
                onClick={() => setTexto(TEMPLATE)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Carregar exemplo
              </button>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[280px] resize-y"
              placeholder="Cole aqui o template preenchido..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
            />
            <p className="text-xs text-outline">
              Formato: tabela com colunas TREINO | DIA_SEMANA | EXERCICIO | SERIES | REPS | CARGA | INTERVALO | COMBINADO_COM | INSTRUCOES
            </p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex justify-end">
            <button
              onClick={handleAnalisar}
              disabled={step === 'analisando'}
              className="btn-primary px-8"
            >
              {step === 'analisando'
                ? <><Loader2 size={16} className="animate-spin" /> Analisando...</>
                : <>Analisar <ChevronRight size={16} /></>
              }
            </button>
          </div>
        </>
      )}

      {/* ── Revisão de conflitos ── */}
      {step === 'revisao' && (
        <>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={18} className="text-orange-500" />
              <h2 className="font-extrabold text-secondary text-lg">Exercícios não reconhecidos</h2>
            </div>
            <p className="text-sm text-outline mb-5">
              {autoCount} exercícios resolvidos automaticamente · {conflicts.length} precisam de confirmação
            </p>

            <div className="space-y-5">
              {conflicts.map((c, i) => (
                <div key={c.inputName} className="bg-background rounded-xl p-4 border border-outline-variant">
                  <p className="font-semibold text-secondary mb-3">
                    <span className="text-xs text-outline font-normal mr-2">Nome no template:</span>
                    {c.inputName}
                  </p>

                  {/* Resolution options */}
                  <div className="space-y-2">
                    {c.suggestions.map(s => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`conflict-${i}`}
                          checked={c.resolution === 'existing' && c.selectedId === s.id}
                          onChange={() => updateConflict(i, { resolution: 'existing', selectedId: s.id })}
                          className="accent-primary"
                        />
                        <span className="text-sm text-secondary">{s.nome}</span>
                        <span className="text-xs text-outline">{s.grupo_muscular}</span>
                      </label>
                    ))}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`conflict-${i}`}
                        checked={c.resolution === 'new'}
                        onChange={() => updateConflict(i, { resolution: 'new' })}
                        className="accent-primary mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <span className="text-sm text-secondary">Criar novo exercício</span>
                        {c.resolution === 'new' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="input text-sm"
                              placeholder="Nome do exercício"
                              value={c.newNome ?? ''}
                              onChange={e => updateConflict(i, { newNome: e.target.value })}
                            />
                            <select
                              className="input text-sm"
                              value={c.newGrupo ?? 'Outros'}
                              onChange={e => updateConflict(i, { newGrupo: e.target.value })}
                            >
                              {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`conflict-${i}`}
                        checked={c.resolution === 'ignore'}
                        onChange={() => updateConflict(i, { resolution: 'ignore' })}
                        className="accent-primary"
                      />
                      <span className="text-sm text-outline">Ignorar este exercício</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex justify-between">
            <button onClick={resetAll} className="btn-secondary">
              <RotateCcw size={14} /> Recomeçar
            </button>
            <button onClick={handleConfirmarConflitos} className="btn-primary px-8">
              Confirmar <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* ── Resumo ── */}
      {(step === 'resumo' || step === 'importando') && (
        <>
          <div className="card">
            <h2 className="font-extrabold text-secondary text-lg mb-4">Resumo da Importação</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Auto-resolvidos', value: autoCount, color: 'text-green-600' },
                { label: 'Confirmados manual', value: manualCount, color: 'text-blue-600' },
                { label: 'Novos criados', value: newCount, color: 'text-primary' },
                { label: 'Ignorados', value: ignoredCount, color: 'text-outline' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-background rounded-xl p-3 text-center">
                  <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-[10px] text-outline mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-outline-variant pt-4 space-y-2">
              <p className="text-sm font-semibold text-secondary mb-2">Treinos</p>
              {treinoLetras.map(letra => {
                const rows = parsedRows.filter(r => r.treino === letra)
                const dia = rows[0]?.diaSemana
                const itensCount = rows.filter(r => !resolvedMap.get(r.exercicio)?.isIgnored).length
                return (
                  <div key={letra} className="flex items-center justify-between py-1.5 px-3 bg-background rounded-lg">
                    <span className="font-semibold text-secondary text-sm">Treino {letra}</span>
                    <span className="text-xs text-outline">{itensCount} exercícios{dia ? ` · ${dia}` : ''}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-outline-variant text-sm text-secondary space-y-1">
              <p><span className="font-semibold">Aluno:</span> {alunos.find(a => a.id === alunoId)?.nome}</p>
              <p><span className="font-semibold">Ciclo:</span> {cicloNome}</p>
              {dataInicio && <p><span className="font-semibold">Período:</span> {dataInicio}{dataFim ? ` → ${dataFim}` : ''}</p>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex justify-between">
            <button
              onClick={() => conflicts.length > 0 ? setStep('revisao') : resetAll()}
              className="btn-secondary"
              disabled={step === 'importando'}
            >
              Voltar
            </button>
            <button
              onClick={handleImportar}
              disabled={step === 'importando'}
              className="btn-primary px-8"
            >
              {step === 'importando'
                ? <><Loader2 size={16} className="animate-spin" /> Importando...</>
                : <>Confirmar e Importar <Upload size={16} /></>
              }
            </button>
          </div>
        </>
      )}

      {/* ── Sucesso ── */}
      {step === 'sucesso' && result && (
        <div className="card text-center py-8 space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-green-500" />
          <h2 className="font-extrabold text-secondary text-xl">Rotina importada!</h2>
          <p className="text-outline text-sm">
            {result.cicloNome} · {result.sessoes} treinos · {result.itens} exercícios
          </p>
          {result.newMappings > 0 && (
            <p className="text-xs text-primary">
              {result.newMappings} novo{result.newMappings !== 1 ? 's' : ''} mapeamento{result.newMappings !== 1 ? 's' : ''} salvo{result.newMappings !== 1 ? 's' : ''} para próximas importações
            </p>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={resetAll} className="btn-secondary">
              Importar outra rotina
            </button>
            <button
              onClick={() => router.push(`/alunos/${alunoId}`)}
              className="btn-primary"
            >
              Ver aluno
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
