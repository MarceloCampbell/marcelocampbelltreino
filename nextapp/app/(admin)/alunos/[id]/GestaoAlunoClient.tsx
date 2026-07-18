'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, Calendar, Scale, AlertCircle, PenLine, Plus, KeyRound, X,
  ChevronLeft, ChevronDown, ChevronRight, ChevronUp, Trash2, Archive, RotateCcw,
  Dumbbell, Wind, UserX, UserCheck, Edit2, BarChart3, ArrowUp, ArrowDown, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type SessaoItem = {
  id: string
  ordem: number
  series: number | null
  repeticoes: string | null
  carga_kg: number | null
  descanso_seg: number | null
  periodizacao_semanal: any
  observacoes: string | null
  biset_grupo: string | null
  exercicio: { id: string; nome: string; grupo_muscular: string; video_url: string | null } | null
}

type SessaoTreino = {
  id: string
  nome: string
  tipo: string
  dia_letra: string | null
  dia_semana_numero: number | null
  orientacoes_aluno: string | null
  observacoes: string | null
  tipo_aerobico: string | null
  status: string
  data: string | null
  ordem: number | null
  sessao_itens: SessaoItem[]
}

type Rotina = {
  id: string
  nome: string
  status: string
  tipo: string
  data_inicio: string | null
  data_fim: string | null
  objetivo: string | null
  orientacoes: string | null
  visivel_antes_de_iniciar: boolean
  ocultar_ao_vencer: boolean
  criado_em: string
  sessoes_treino: SessaoTreino[]
}

type Exercicio = {
  id: string
  nome: string
  grupo_muscular: string
  categoria: string | null
  equipamento: string | null
  video_url: string | null
  musculo_primario: string | null
  musculo_secundario: string | null
  musculo_terciario: string | null
  series_secundario: number | null
  series_terciario: number | null
}

type SemanaItem = { semana: number; series: string; repeticoes: string; carga_kg: string }
type ItemForm = {
  key: string
  exercicio_id: string
  nome: string
  grupo_muscular: string
  ordem: number
  periodizacao: SemanaItem[]
  descanso_seg: string
  observacoes: string
  metodo: string
  metodo_params: Record<string, string>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MC_MODELO: { series: string; repeticoes: string; fase: string; missao: string; mensagem: string }[] = [
  { series: '3', repeticoes: '10-12', fase: 'Adaptação Técnica', missao: 'Encontrar a carga ideal para cada exercício, registrar suas primeiras cargas e aprender a execução perfeita.', mensagem: 'Semana de Adaptação Técnica. Aproveite para encontrar a carga ideal, aprender a execução correta dos exercícios e registrar suas primeiras cargas. A prioridade é qualidade, não peso.' },
  { series: '3', repeticoes: '10-12', fase: 'Consolidação', missao: 'Melhorar a qualidade dos movimentos e tentar pequenas progressões de carga ou repetições.', mensagem: 'Semana de Consolidação. Agora que você já conhece os exercícios, tente melhorar sua execução e, se possível, aumentar algumas repetições ou pequenas cargas mantendo a técnica.' },
  { series: '3', repeticoes: '8-10', fase: 'Progressão', missao: 'Evoluir as cargas nos exercícios principais mantendo a técnica.', mensagem: 'Semana de Progressão. Hora de começar a evoluir as cargas nos exercícios principais. Busque desafiar seu corpo sem comprometer a execução.' },
  { series: '3', repeticoes: '8-10', fase: 'Estabilidade', missao: 'Consolidar as novas cargas e repetir boas execuções.', mensagem: 'Semana de Estabilidade. Mantenha as cargas conquistadas na semana passada e foque em executar todas as séries com qualidade e consistência.' },
  { series: '3', repeticoes: '12-15', fase: 'Volume', missao: 'Buscar maior controle muscular e mais repetições, sem pressa para aumentar a carga.', mensagem: 'Semana de Volume. Reduza um pouco a carga e aumente o número de repetições. O objetivo é melhorar o controle, a conexão muscular e a resistência.' },
  { series: '3', repeticoes: '7-9', fase: 'Intensidade', missao: 'Retomar cargas elevadas e bater novos recordes com segurança.', mensagem: 'Semana de Intensidade. Voltamos a trabalhar com cargas mais altas. Tente superar seus números anteriores mantendo boa técnica.' },
  { series: '4', repeticoes: '7-9', fase: 'Expansão', missao: 'Suportar um volume maior de treino mantendo a qualidade.', mensagem: 'Semana de Expansão. Agora teremos uma série extra nos principais exercícios. O desafio é manter ou evoluir as cargas da semana anterior sem perder qualidade.' },
  { series: '4', repeticoes: '6-8', fase: 'Força', missao: 'Trabalhar pesado, mantendo foco total na execução.', mensagem: 'Semana de Força. Este é um dos blocos mais intensos do ciclo. Trabalhe com cargas elevadas e máxima concentração em cada repetição.' },
  { series: '4', repeticoes: '6-8', fase: 'Performance', missao: 'Entregar sua melhor semana do ciclo.', mensagem: 'Semana de Performance. Busque sua melhor performance do ciclo. Mantenha ou evolua as cargas da semana passada e execute cada série com excelência.' },
  { series: '3', repeticoes: '8-10', fase: 'Refinamento', missao: 'Recuperar um pouco do volume sem perder desempenho.', mensagem: 'Semana de Refinamento. Reduzimos um pouco o volume para recuperar energia, mas mantendo as cargas conquistadas. O foco é preservar a performance.' },
  { series: '3', repeticoes: '12-15', fase: 'Recuperação Ativa', missao: 'Recuperar seu corpo, aperfeiçoar a técnica e preparar-se para o próximo ciclo.', mensagem: 'Semana de Recuperação Ativa. Diminua a intensidade e priorize técnica, amplitude e controle dos movimentos. Essa semana prepara seu corpo para iniciar um novo ciclo ainda mais forte.' },
  { series: '3', repeticoes: '8-10', fase: 'Fechamento', missao: 'Avaliar sua evolução, celebrar suas conquistas e iniciar o próximo ciclo ainda melhor.', mensagem: 'Semana de Fechamento do Ciclo. Compare sua evolução com o início do programa, registre suas conquistas e prepare-se para iniciar um novo ciclo em um nível ainda mais alto.' },
]

const TABS = ['Treinos', 'Aeróbico', 'Dados', 'Ficha Saúde', 'Anotações', 'Feedbacks', 'Pontuação / Evolução']
const DIA_LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DIAS_SEMANA = [
  { value: '', label: 'Sem dia' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
]
const TIPOS_AEROBICO = ['Longão', 'Sprints / Tiros', 'Fartlek', 'Regenerativo', 'Intervalado', 'Ritmo', 'Progressivo', 'Outro']
const MODALIDADES_AEROBICO = ['Esteira', 'Escada', 'Bicicleta', 'Elíptico']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDuracao(inicio: string, fim: string) {
  if (!inicio || !fim) return ''
  const d1 = new Date(inicio), d2 = new Date(fim)
  if (d2 <= d1) return ''
  const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  const semanas = Math.ceil(dias / 7)
  return `${semanas} semanas / ${dias} dias`
}

function calcNumSemanas(rotina: Rotina | null): number {
  if (!rotina?.data_inicio || !rotina?.data_fim) return 4
  const d1 = new Date(rotina.data_inicio)
  const d2 = new Date(rotina.data_fim)
  if (d2 <= d1) return 4
  const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.ceil(dias / 7))
}

function buildPeriodizacao(n: number): SemanaItem[] {
  return Array.from({ length: n }, (_, i) => {
    const m = MC_MODELO[i]
    return { semana: i + 1, series: m?.series ?? '3', repeticoes: m?.repeticoes ?? '10-12', carga_kg: '' }
  })
}

const statusLabel = (s: string) => {
  if (s === 'ativo' || s === 'planejado') return 'Ativa'
  if (s === 'concluido' || s === 'arquivado') return 'Arquivada'
  if (s === 'excluido') return 'Excluída'
  return s
}

const isRotinaAtiva = (s: string) => s === 'ativo' || s === 'planejado'
const isRotinaArquivada = (s: string) => s === 'concluido' || s === 'arquivado'
const isRotinaExcluida = (s: string) => s === 'excluido'

function calcVolume(rotina: Rotina, biblioteca: Exercicio[]) {
  const byGrupoSemana: Record<string, Record<number, number>> = {}
  let maxSemanas = 0

  for (const sessao of rotina.sessoes_treino) {
    for (const item of sessao.sessao_itens) {
      const exId = item.exercicio?.id
      const bibEx = exId ? biblioteca.find(e => e.id === exId) : null
      const musculoPri = bibEx?.musculo_primario || item.exercicio?.grupo_muscular || 'Geral'
      const musculoSec = bibEx?.musculo_secundario || null
      const musculoTer = bibEx?.musculo_terciario || null
      const pesoPri = 1.0
      const pesoSec = bibEx?.series_secundario ?? 0.5
      const pesoTer = bibEx?.series_terciario ?? 0.5

      const periodizacao: SemanaItem[] = item.periodizacao_semanal ?? []
      if (periodizacao.length > maxSemanas) maxSemanas = periodizacao.length

      for (const p of periodizacao) {
        const s = parseFloat(String(p.series)) || 0
        if (s === 0) continue
        if (!byGrupoSemana[musculoPri]) byGrupoSemana[musculoPri] = {}
        byGrupoSemana[musculoPri][p.semana] = (byGrupoSemana[musculoPri][p.semana] || 0) + s * pesoPri
        if (musculoSec) {
          if (!byGrupoSemana[musculoSec]) byGrupoSemana[musculoSec] = {}
          byGrupoSemana[musculoSec][p.semana] = (byGrupoSemana[musculoSec][p.semana] || 0) + s * pesoSec
        }
        if (musculoTer) {
          if (!byGrupoSemana[musculoTer]) byGrupoSemana[musculoTer] = {}
          byGrupoSemana[musculoTer][p.semana] = (byGrupoSemana[musculoTer][p.semana] || 0) + s * pesoTer
        }
      }
    }
  }

  const grupos = Object.keys(byGrupoSemana).sort()
  const semanas = maxSemanas > 0 ? Array.from({ length: maxSemanas }, (_, i) => i + 1) : []
  return { byGrupoSemana, grupos, semanas }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GestaoAlunoClient({
  aluno,
  ciclos,
  exerciciosBiblioteca,
  feedbacks_semanais,
  pendencias,
  anotacoes,
  academias,
  academiasExtrasIds,
}: {
  aluno: any
  ciclos: Rotina[]
  exerciciosBiblioteca: Exercicio[]
  feedbacks_semanais: any[]
  pendencias: any[]
  anotacoes: any[]
  academias: { id: string; nome: string }[]
  academiasExtrasIds: string[]
}) {
  const supabase = createClient()
  const router = useRouter()

  // ── Global
  const [tab, setTab] = useState(0)

  // ── Treinos tab
  const [ciclosList, setCiclosList] = useState<Rotina[]>(ciclos)
  const [rotinaView, setRotinaView] = useState<'ativa' | 'arquivada' | 'excluida'>('ativa')
  const [selectedRotina, setSelectedRotina] = useState<Rotina | null>(null)
  const [rotinaSubTab, setRotinaSubTab] = useState<0 | 1>(1) // 0=Adicionar, 1=Treinos
  const [showVolume, setShowVolume] = useState(false)
  const [showNovaRotina, setShowNovaRotina] = useState(false)
  const [novaRotina, setNovaRotina] = useState({
    nome: '', objetivo: '', orientacoes: '', data_inicio: '', data_fim: '',
    tipo: 'musculacao', visivel_antes_de_iniciar: true, ocultar_ao_vencer: false,
  })
  const [savingRotina, setSavingRotina] = useState(false)
  const [editingRotina, setEditingRotina] = useState(false)
  const [editRotinaForm, setEditRotinaForm] = useState({ nome: '', objetivo: '', orientacoes: '', data_inicio: '', data_fim: '', visivel_antes_de_iniciar: true, ocultar_ao_vencer: false })
  const [savingEditRotina, setSavingEditRotina] = useState(false)

  // ── Bi-set selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  // ── Edit sessao item inline
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemPeriod, setEditItemPeriod] = useState<SemanaItem[]>([])
  const [editItemObs, setEditItemObs] = useState('')
  const [editItemDescanso, setEditItemDescanso] = useState('90')
  const [editItemExId, setEditItemExId] = useState('')
  const [editItemExNome, setEditItemExNome] = useState('')
  const [editItemExSearch, setEditItemExSearch] = useState('')
  const [editItemMetodo, setEditItemMetodo] = useState('')
  const [editItemMetodoParams, setEditItemMetodoParams] = useState<Record<string, string>>({})
  const [savingItem, setSavingItem] = useState(false)

  // ── Add exercise to existing sessão
  const [addingExToSessaoId, setAddingExToSessaoId] = useState<string | null>(null)
  const [addExSearch, setAddExSearch] = useState('')
  const [addExGrupo, setAddExGrupo] = useState('')
  const [addingExLoading, setAddingExLoading] = useState(false)

  // ── Novo dia de treino (inside selected rotina)
  const [novaDia, setNovaDia] = useState({
    nome: '', dia_letra: 'A', dia_semana_numero: '', tipo: 'musculacao',
    orientacoes_aluno: '', descricao_aerobico: '', tipo_aerobico: '',
  })
  const [sessaoItens, setSessaoItens] = useState<ItemForm[]>([])
  const [numSemanas, setNumSemanas] = useState(4)
  const [searchEx, setSearchEx] = useState('')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [savingDia, setSavingDia] = useState(false)
  const [reordering, setReordering] = useState(false)

  // ── Anotações
  const [novaNota, setNovaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [notaError, setNotaError] = useState('')
  const [anotacoesList, setAnotacoesList] = useState(anotacoes)

  // ── Academias extras (item 15)
  const [academiasExtras, setAcademiasExtras] = useState<Set<string>>(new Set(academiasExtrasIds))
  const [savingAcademia, setSavingAcademia] = useState<string | null>(null)

  // ── Password reset
  const [showResetModal, setShowResetModal] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  // ── Aluno status
  const [alunoStatus, setAlunoStatus] = useState<string>(aluno.status ?? 'ativo')
  const [statusLoading, setStatusLoading] = useState(false)

  // ── Edit dados pessoais
  const [editingDados, setEditingDados] = useState(false)
  const [savingDados, setSavingDados] = useState(false)
  const [dadosForm, setDadosForm] = useState({
    nome: aluno.usuario?.nome ?? '',
    telefone: aluno.usuario?.telefone ?? '',
    data_nascimento: aluno.usuario?.data_nascimento ?? '',
    plano_contratado: aluno.plano_contratado ?? '',
    valor_plano: aluno.valor_plano?.toString() ?? '',
    data_inicio: aluno.data_inicio ?? '',
    data_renovacao: aluno.data_renovacao ?? '',
    nivel: aluno.nivel ?? '',
    autonomia: aluno.autonomia ?? '',
    disciplina: aluno.disciplina ?? '',
    horario_treino: aluno.horario_treino ?? '',
    objetivo: aluno.objetivo ?? '',
    horario_contato_preferido: aluno.horario_contato_preferido ?? '',
    academia_id: aluno.academia?.id ?? '',
  })

  async function saveDados() {
    setSavingDados(true)
    await Promise.all([
      supabase.from('usuarios').update({
        nome: dadosForm.nome.trim() || null,
        telefone: dadosForm.telefone.trim() || null,
        data_nascimento: dadosForm.data_nascimento || null,
      }).eq('id', aluno.usuario?.id),
      supabase.from('alunos').update({
        plano_contratado: dadosForm.plano_contratado || null,
        valor_plano: dadosForm.valor_plano ? parseFloat(dadosForm.valor_plano) : null,
        data_inicio: dadosForm.data_inicio || null,
        data_renovacao: dadosForm.data_renovacao || null,
        nivel: dadosForm.nivel || null,
        autonomia: dadosForm.autonomia || null,
        disciplina: dadosForm.disciplina || null,
        horario_treino: dadosForm.horario_treino || null,
        objetivo: dadosForm.objetivo || null,
        horario_contato_preferido: dadosForm.horario_contato_preferido || null,
        academia_id: dadosForm.academia_id || null,
      } as any).eq('id', aluno.id),
    ])
    setSavingDados(false)
    setEditingDados(false)
    router.refresh()
  }

  // ── Derived
  const nome = aluno.usuario?.nome ?? 'Aluno'
  const initials = nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
  const score = aluno.score
  const badges = aluno.aluno_badges ?? []
  const aderencia = score?.aderencia_mes ?? 0
  const grupos = [...new Set(exerciciosBiblioteca.map(e => e.grupo_muscular).filter(Boolean))]

  // ─── Functions ─────────────────────────────────────────────────────────────

  function openRotina(rotina: Rotina, subTab: 0 | 1 = 1) {
    setSelectedRotina(rotina)
    setRotinaSubTab(subTab)
    setNumSemanas(calcNumSemanas(rotina))
    setShowVolume(false)
    setSessaoItens([])
    setNovaDia({ nome: '', dia_letra: 'A', dia_semana_numero: '', tipo: 'musculacao', orientacoes_aluno: '', descricao_aerobico: '', tipo_aerobico: '' })
  }

  async function createRotina() {
    if (!novaRotina.nome.trim()) return
    setSavingRotina(true)
    const { data, error } = await supabase.from('ciclos').insert({
      aluno_id: aluno.id,
      nome: novaRotina.nome,
      objetivo: novaRotina.objetivo || null,
      orientacoes: novaRotina.orientacoes || null,
      data_inicio: novaRotina.data_inicio || null,
      data_fim: novaRotina.data_fim || null,
      tipo: tab === 1 ? 'aerobico' : novaRotina.tipo,
      visivel_antes_de_iniciar: novaRotina.visivel_antes_de_iniciar,
      ocultar_ao_vencer: novaRotina.ocultar_ao_vencer,
      status: 'ativo',
    }).select('*, sessoes_treino(*, sessao_itens(*))').single()
    if (!error && data) {
      setCiclosList(prev => [data as unknown as Rotina, ...prev])
      setShowNovaRotina(false)
      setNovaRotina({ nome: '', objetivo: '', orientacoes: '', data_inicio: '', data_fim: '', tipo: 'musculacao', visivel_antes_de_iniciar: true, ocultar_ao_vencer: false })
    }
    setSavingRotina(false)
  }

  async function saveEditRotina() {
    if (!selectedRotina || !editRotinaForm.nome.trim()) return
    setSavingEditRotina(true)
    const { data } = await supabase.from('ciclos').update({
      nome: editRotinaForm.nome.trim(),
      objetivo: editRotinaForm.objetivo || null,
      orientacoes: editRotinaForm.orientacoes || null,
      data_inicio: editRotinaForm.data_inicio || null,
      data_fim: editRotinaForm.data_fim || null,
      visivel_antes_de_iniciar: editRotinaForm.visivel_antes_de_iniciar,
      ocultar_ao_vencer: editRotinaForm.ocultar_ao_vencer,
    }).eq('id', selectedRotina.id).select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))').single()
    if (data) {
      const updated = data as unknown as Rotina
      setSelectedRotina(updated)
      setCiclosList(prev => prev.map(c => c.id === selectedRotina.id ? updated : c))
      setNumSemanas(calcNumSemanas(updated))
    }
    setEditingRotina(false)
    setSavingEditRotina(false)
  }

  function startEditItem(item: SessaoItem) {
    const period: SemanaItem[] = item.periodizacao_semanal?.length > 0
      ? item.periodizacao_semanal
      : [{ semana: 1, series: String(item.series ?? '3'), repeticoes: item.repeticoes ?? '10-12', carga_kg: String(item.carga_kg ?? '') }]
    setEditingItemId(item.id)
    setEditItemPeriod(period)
    setEditItemObs(item.observacoes ?? '')
    setEditItemDescanso(String(item.descanso_seg ?? 90))
    setEditItemExId(item.exercicio?.id ?? '')
    setEditItemExNome(item.exercicio?.nome ?? '')
    setEditItemExSearch('')
    setEditItemMetodo('')
    setEditItemMetodoParams({})
  }

  async function saveEditItem(sessaoId: string, itemId: string) {
    setSavingItem(true)
    const updates: any = {
      series: parseInt(editItemPeriod[0]?.series) || null,
      repeticoes: editItemPeriod[0]?.repeticoes || null,
      carga_kg: parseFloat(editItemPeriod[0]?.carga_kg) || null,
      descanso_seg: parseInt(editItemDescanso) || null,
      observacoes: editItemObs || null,
      periodizacao_semanal: editItemPeriod,
    }
    if (editItemExId) updates.exercicio_id = editItemExId
    await supabase.from('sessao_itens').update(updates).eq('id', itemId)
    // refresh rotina
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina!.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
    setEditingItemId(null)
    setSavingItem(false)
  }

  async function deleteItem(sessaoId: string, itemId: string) {
    await supabase.from('sessao_itens').delete().eq('id', itemId)
    setSelectedItemIds(prev => { const s = new Set(prev); s.delete(itemId); return s })
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina!.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
  }

  async function combinarItems() {
    if (!selectedRotina || selectedItemIds.size < 2) return
    const grupoId = crypto.randomUUID().slice(0, 8)
    await Promise.all([...selectedItemIds].map(id =>
      supabase.from('sessao_itens').update({ biset_grupo: grupoId }).eq('id', id)
    ))
    setSelectedItemIds(new Set())
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
  }

  async function descombinarGrupo(grupoId: string) {
    if (!selectedRotina) return
    await supabase.from('sessao_itens').update({ biset_grupo: null }).eq('biset_grupo', grupoId)
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
  }

  async function addExToExistingSessao(sessaoId: string, ex: Exercicio) {
    if (!selectedRotina) return
    setAddingExLoading(true)
    const sessao = selectedRotina.sessoes_treino.find(s => s.id === sessaoId)
    const maxOrdem = sessao && sessao.sessao_itens.length > 0
      ? Math.max(...sessao.sessao_itens.map(i => i.ordem))
      : 0
    await supabase.from('sessao_itens').insert({
      sessao_id: sessaoId,
      exercicio_id: ex.id,
      ordem: maxOrdem + 1,
      series: 3,
      repeticoes: '10-12',
      periodizacao_semanal: buildPeriodizacao(numSemanas),
    })
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
    setAddExSearch('')
    setAddingExLoading(false)
  }

  function applyMetodoTemplate(metodo: string, params: Record<string, string>): string {
    switch (metodo) {
      case 'cluster_set':
        return `Cluster Set: ${params.blocos || '?'} blocos × ${params.reps_bloco || '?'} reps | Descanso entre blocos: ${params.descanso || '?'}s`
      case 'rest_pause':
        return `Rest Pause: ${params.r1 || '?'} + ${params.r2 || '?'} + ${params.r3 || '?'} reps | Descanso: ${params.descanso || '?'}s`
      case 'drop_set':
        return `Drop Set: reduzir ${params.pct || '?'}% de carga até a falha`
      case 'back_off_set':
        return `Back Off Set: −${params.pct || '?'}% de carga na série extra | Descanso extra: ${params.descanso || '?'}s`
      case 'pausa_excentrica':
        return `Pausa excêntrica: ${params.seg || '3'}s no ponto de maior tensão`
      case 'pico_contracao':
        return `Pico de contração: ${params.seg || '2'}s de pausa no topo do movimento`
      case 'reps_parciais':
        return `Repetições parciais: últimas ${params.reps || '4'} reps em ¾ do movimento`
      case 'descanso_especifico':
        return `Descanso específico: ${params.seg || '90'}s entre séries`
      default:
        return ''
    }
  }

  async function deleteSessao(sessaoId: string) {
    if (!confirm('Excluir este dia de treino? Todos os exercícios serão removidos.')) return
    await supabase.from('sessao_itens').delete().eq('sessao_id', sessaoId)
    await supabase.from('sessoes_treino').delete().eq('id', sessaoId)
    const { data: updated } = await supabase
      .from('ciclos').select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
      .eq('id', selectedRotina!.id).single()
    if (updated) {
      const updatedRotina = updated as unknown as Rotina
      setSelectedRotina(updatedRotina)
      setCiclosList(prev => prev.map(c => c.id === updatedRotina.id ? updatedRotina : c))
    }
  }

  async function arquivarRotina(id: string) {
    await supabase.from('ciclos').update({ status: 'arquivado' }).eq('id', id)
    setCiclosList(prev => prev.map(c => c.id === id ? { ...c, status: 'arquivado' } : c))
    if (selectedRotina?.id === id) setSelectedRotina(null)
  }

  async function excluirRotina(id: string) {
    if (!confirm('Mover para excluídos? Você poderá restaurar depois.')) return
    await supabase.from('ciclos').update({ status: 'excluido' }).eq('id', id)
    setCiclosList(prev => prev.map(c => c.id === id ? { ...c, status: 'excluido' } : c))
    if (selectedRotina?.id === id) setSelectedRotina(null)
  }

  async function restaurarRotina(id: string) {
    await supabase.from('ciclos').update({ status: 'ativo' }).eq('id', id)
    setCiclosList(prev => prev.map(c => c.id === id ? { ...c, status: 'ativo' } : c))
  }

  function addExercicio(ex: Exercicio) {
    if (sessaoItens.find(i => i.exercicio_id === ex.id)) return
    setSessaoItens(prev => [...prev, {
      key: crypto.randomUUID(),
      exercicio_id: ex.id,
      nome: ex.nome,
      grupo_muscular: ex.grupo_muscular,
      ordem: prev.length + 1,
      periodizacao: buildPeriodizacao(numSemanas),
      descanso_seg: '90',
      observacoes: '',
      metodo: '',
      metodo_params: {},
    }])
    setSearchEx('')
  }

  function removeItem(key: string) {
    setSessaoItens(prev => prev.filter(i => i.key !== key))
  }

  function updateItemField(key: string, field: 'observacoes' | 'descanso_seg', value: string) {
    setSessaoItens(prev => prev.map(i => i.key !== key ? i : { ...i, [field]: value }))
  }

  function updateItemMetodo(key: string, metodo: string, params: Record<string, string>, obs: string) {
    setSessaoItens(prev => prev.map(i => i.key !== key ? i : { ...i, metodo, metodo_params: params, observacoes: obs }))
  }

  function updatePeriod(key: string, semana: number, field: keyof SemanaItem, value: string) {
    setSessaoItens(prev => prev.map(i => i.key !== key ? i : {
      ...i,
      periodizacao: i.periodizacao.map(p => p.semana === semana ? { ...p, [field]: value } : p),
    }))
  }

  function updateNumSemanas(n: number) {
    setNumSemanas(n)
    setSessaoItens(prev => prev.map(i => ({
      ...i,
      periodizacao: n > i.periodizacao.length
        ? [...i.periodizacao, ...buildPeriodizacao(n - i.periodizacao.length).map((p, j) => ({ ...p, semana: i.periodizacao.length + j + 1 }))]
        : i.periodizacao.slice(0, n),
    })))
  }

  async function moverSessao(sessaoId: string, direcao: 'up' | 'down') {
    if (!selectedRotina || reordering) return
    setReordering(true)
    const sorted = [...selectedRotina.sessoes_treino].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99))
    const idx = sorted.findIndex(s => s.id === sessaoId)
    const swapIdx = direcao === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) { setReordering(false); return }

    const newSorted = [...sorted]
    ;[newSorted[idx], newSorted[swapIdx]] = [newSorted[swapIdx], newSorted[idx]]

    const updates = newSorted.map((s, i) => ({ id: s.id, ordem: i, dia_letra: DIA_LETRAS[i] ?? null }))
    await Promise.all(updates.map(u =>
      supabase.from('sessoes_treino').update({ ordem: u.ordem, dia_letra: u.dia_letra }).eq('id', u.id)
    ))

    const updatedSessoes = updates.map(u => {
      const orig = sorted.find(s => s.id === u.id)!
      return { ...orig, ordem: u.ordem, dia_letra: u.dia_letra }
    })
    const updated = { ...selectedRotina, sessoes_treino: updatedSessoes }
    setSelectedRotina(updated)
    setCiclosList(prev => prev.map(c => c.id === selectedRotina.id ? updated : c))
    setReordering(false)
  }

  async function createSessaoDia() {
    if (!selectedRotina) return
    setSavingDia(true)
    const nomeSessao = novaDia.nome || `Treino ${novaDia.dia_letra}`
    const nextOrdem = selectedRotina.sessoes_treino.length

    const { data: sessao, error } = await supabase.from('sessoes_treino').insert({
      aluno_id: aluno.id,
      ciclo_id: selectedRotina.id,
      nome: nomeSessao,
      tipo: tab === 1 ? 'aerobico' : novaDia.tipo,
      dia_letra: novaDia.dia_letra,
      dia_semana_numero: novaDia.dia_semana_numero ? parseInt(novaDia.dia_semana_numero) : null,
      orientacoes_aluno: novaDia.orientacoes_aluno || null,
      observacoes: novaDia.tipo === 'aerobico' ? novaDia.descricao_aerobico || null : null,
      tipo_aerobico: novaDia.tipo === 'aerobico' ? novaDia.tipo_aerobico || null : null,
      status: 'pendente',
      ordem: nextOrdem,
    }).select('*, sessao_itens(*)').single()

    if (!error && sessao) {
      if (sessaoItens.length > 0 && tab !== 1 && novaDia.tipo !== 'aerobico') {
        await supabase.from('sessao_itens').insert(sessaoItens.map((it, idx) => ({
          sessao_id: sessao.id,
          exercicio_id: it.exercicio_id,
          ordem: idx + 1,
          series: parseInt(it.periodizacao[0]?.series) || null,
          repeticoes: it.periodizacao[0]?.repeticoes || null,
          carga_kg: parseFloat(it.periodizacao[0]?.carga_kg) || null,
          descanso_seg: parseInt(it.descanso_seg) || null,
          observacoes: it.observacoes || null,
          periodizacao_semanal: it.periodizacao,
        })))
      }
      // Refresh selected rotina from DB
      const { data: updated } = await supabase
        .from('ciclos')
        .select('*, sessoes_treino(*, sessao_itens(*, exercicio:exercicios(id, nome, grupo_muscular, video_url)))')
        .eq('id', selectedRotina.id)
        .single()
      if (updated) {
        const updatedRotina = updated as unknown as Rotina
        setSelectedRotina(updatedRotina)
        setCiclosList(prev => prev.map(c => c.id === selectedRotina.id ? updatedRotina : c))
      }
      setNovaDia({ nome: '', dia_letra: 'A', dia_semana_numero: '', tipo: 'musculacao', orientacoes_aluno: '', descricao_aerobico: '', tipo_aerobico: '' })
      setSessaoItens([])
      setSearchEx('')
      setRotinaSubTab(1)
    }
    setSavingDia(false)
  }

  async function saveNota() {
    if (!novaNota.trim()) return
    setSavingNota(true)
    setNotaError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase.from('usuarios').select('id, nome').eq('auth_id', user!.id).single()
      const { data: nova, error } = await supabase.from('anotacoes').insert({
        aluno_id: aluno.id,
        autor_id: usuario!.id,
        texto: novaNota,
        tipo: 'geral',
      }).select('*, autor:usuarios(nome)').single()
      if (error) throw error
      setAnotacoesList((prev: any[]) => [nova, ...prev])
      setNovaNota('')
    } catch (e: any) {
      setNotaError(e.message ?? 'Erro ao salvar')
    } finally {
      setSavingNota(false)
    }
  }

  async function deleteNota(id: string) {
    if (!confirm('Excluir esta anotação?')) return
    const { error } = await supabase.from('anotacoes').delete().eq('id', id)
    if (!error) setAnotacoesList((prev: any[]) => prev.filter((a: any) => a.id !== id))
  }

  async function resetSenha() {
    if (!novaSenha || novaSenha.length < 6) { setResetMsg('Mínimo 6 caracteres.'); return }
    setResetLoading(true)
    setResetMsg('')
    const res = await fetch('/api/alunos/reset-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_id: aluno.usuario?.auth_id, nova_senha: novaSenha }),
    })
    const json = await res.json()
    setResetLoading(false)
    if (!res.ok) { setResetMsg(json.error ?? 'Erro ao redefinir'); return }
    setResetMsg('Senha redefinida com sucesso!')
    setNovaSenha('')
  }

  async function inativarAluno() {
    if (!confirm(`Inativar ${nome}? O aluno não poderá mais acessar o app.`)) return
    setStatusLoading(true)
    await supabase.from('alunos').update({ status: 'inativo' }).eq('id', aluno.id)
    setAlunoStatus('inativo')
    setStatusLoading(false)
  }

  async function ativarAluno() {
    setStatusLoading(true)
    await supabase.from('alunos').update({ status: 'ativo' }).eq('id', aluno.id)
    setAlunoStatus('ativo')
    setStatusLoading(false)
  }

  async function excluirAluno() {
    if (!confirm(`EXCLUIR ${nome} PERMANENTEMENTE?\n\nEsta ação é IRREVERSÍVEL e remove todos os dados do aluno.`)) return
    const res = await fetch(`/api/alunos/${aluno.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/alunos')
    else alert('Erro ao excluir aluno. Tente novamente.')
  }

  async function toggleAcademiaExtra(acadId: string) {
    setSavingAcademia(acadId)
    if (academiasExtras.has(acadId)) {
      await supabase.from('aluno_academias_extras').delete().eq('aluno_id', aluno.id).eq('academia_id', acadId)
      setAcademiasExtras(prev => { const s = new Set(prev); s.delete(acadId); return s })
    } else {
      await supabase.from('aluno_academias_extras').insert({ aluno_id: aluno.id, academia_id: acadId })
      setAcademiasExtras(prev => new Set([...prev, acadId]))
    }
    setSavingAcademia(null)
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const rotinasFiltradas = ciclosList.filter(c => {
    if (tab === 0 && c.tipo === 'aerobico') return false
    if (tab === 1 && c.tipo !== 'aerobico') return false
    if (rotinaView === 'ativa') return isRotinaAtiva(c.status)
    if (rotinaView === 'arquivada') return isRotinaArquivada(c.status)
    return isRotinaExcluida(c.status)
  })

  const exFiltrados = exerciciosBiblioteca.filter(e =>
    (!grupoFilter || e.grupo_muscular === grupoFilter) &&
    (!searchEx || e.nome.toLowerCase().includes(searchEx.toLowerCase()))
  )

  const exFiltradosAdd = exerciciosBiblioteca.filter(e =>
    (!addExGrupo || e.grupo_muscular === addExGrupo) &&
    (!addExSearch || e.nome.toLowerCase().includes(addExSearch.toLowerCase()))
  )

  // Next available letter suggestion
  const nextLetra = DIA_LETRAS[selectedRotina?.sessoes_treino.length ?? 0] ?? 'A'

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-secondary">{nome}</h2>
              {aluno.plano_contratado && <span className="badge-baixa">{aluno.plano_contratado}</span>}
              {pendencias.length > 0 && <span className="badge-urgente">{pendencias.length} pendências</span>}
              {alunoStatus === 'inativo' && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Inativo</span>
              )}
            </div>
            <p className="text-sm text-outline mt-1">
              {aluno.academia?.nome && `${aluno.academia.nome} · `}
              Início: {aluno.data_inicio ? new Date(aluno.data_inicio).toLocaleDateString('pt-BR') : '–'}
            </p>
            {aluno.objetivo && <p className="text-sm text-secondary mt-1 font-medium">Objetivo: {aluno.objetivo}</p>}
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            {aluno.data_renovacao && (
              <div className="flex items-center gap-1 text-xs text-outline">
                <Calendar size={12} />
                Renovação: {new Date(aluno.data_renovacao).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-primary-dark">{aderencia.toFixed(0)}%</p>
            <p className="text-xs text-outline mt-0.5">Aderência Mês</p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-secondary">{score?.sequencia_atual ?? 0}</p>
            <p className="text-xs text-outline mt-0.5">Semanas seguidas</p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-secondary">
              {ciclosList.reduce((acc, c) => acc + c.sessoes_treino.filter(s => s.status === 'realizado').length, 0)}
            </p>
            <p className="text-xs text-outline mt-0.5">Treinos realizados</p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-2xl font-extrabold text-secondary">{score?.pontos_total ?? 0}</p>
            <p className="text-xs text-outline mt-0.5">Pontos totais</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {badges.map((ab: any) => (
              <span key={ab.badge.id} title={ab.badge.descricao} className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold rounded-full">
                {ab.badge.icone} {ab.badge.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow-card p-1 mb-6 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === i ? 'bg-primary-dark text-white' : 'text-secondary hover:bg-gray-100'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB 0/1: Treinos / Aeróbico ────────────────────────────────────── */}
      {(tab === 0 || tab === 1) && (
        <div>
          {!selectedRotina ? (
            // ── Rotina list view
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex gap-2">
                  {(['ativa', 'arquivada', 'excluida'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setRotinaView(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${rotinaView === v ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary hover:bg-gray-50'}`}
                    >
                      {v === 'ativa' ? 'Ativas' : v === 'arquivada' ? 'Arquivadas' : 'Excluídas'}
                      <span className="ml-1.5 text-xs opacity-70">
                        ({ciclosList.filter(c => v === 'ativa' ? isRotinaAtiva(c.status) : v === 'arquivada' ? isRotinaArquivada(c.status) : isRotinaExcluida(c.status)).length})
                      </span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowNovaRotina(true)} className="btn-primary text-sm px-4 py-2">
                  <Plus size={16} /> Criar Rotina
                </button>
              </div>

              {/* Create rotina form */}
              {showNovaRotina && (
                <div className="card mb-4 border-2 border-primary">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-secondary">{tab === 1 ? 'Nova Rotina Aeróbica' : 'Nova Rotina de Treino'}</h3>
                    <button onClick={() => setShowNovaRotina(false)} className="text-outline hover:text-secondary"><X size={18} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Nome *</label>
                      <input className="input" placeholder="Ex: Hipertrofia Fase 1" value={novaRotina.nome} onChange={e => setNovaRotina(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Objetivo</label>
                      <input className="input" placeholder="Ex: Ganho de massa" value={novaRotina.objetivo} onChange={e => setNovaRotina(p => ({ ...p, objetivo: e.target.value }))} />
                    </div>
                    {tab === 0 && (
                      <div>
                        <label className="label">Tipo</label>
                        <select className="input" value={novaRotina.tipo} onChange={e => setNovaRotina(p => ({ ...p, tipo: e.target.value }))}>
                          <option value="musculacao">Musculação</option>
                          <option value="aerobico">Aeróbico</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="label">Data de início</label>
                      <input type="date" className="input" value={novaRotina.data_inicio} onChange={e => setNovaRotina(p => ({ ...p, data_inicio: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">
                        Data de término
                        {novaRotina.data_inicio && novaRotina.data_fim && (
                          <span className="ml-2 text-primary font-semibold">{calcDuracao(novaRotina.data_inicio, novaRotina.data_fim)}</span>
                        )}
                      </label>
                      <input type="date" className="input" value={novaRotina.data_fim} min={novaRotina.data_inicio || undefined} onChange={e => setNovaRotina(p => ({ ...p, data_fim: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Orientações para o aluno</label>
                      <textarea className="input min-h-[80px]" placeholder="Instruções visíveis ao aluno..." value={novaRotina.orientacoes} onChange={e => setNovaRotina(p => ({ ...p, orientacoes: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="visivel" className="w-4 h-4" checked={novaRotina.visivel_antes_de_iniciar} onChange={e => setNovaRotina(p => ({ ...p, visivel_antes_de_iniciar: e.target.checked }))} />
                      <label htmlFor="visivel" className="text-sm text-secondary cursor-pointer">Aluno pode ver antes de iniciar</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="ocultar" className="w-4 h-4" checked={novaRotina.ocultar_ao_vencer} onChange={e => setNovaRotina(p => ({ ...p, ocultar_ao_vencer: e.target.checked }))} />
                      <label htmlFor="ocultar" className="text-sm text-secondary cursor-pointer">Ocultar do aluno após o término</label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={createRotina} disabled={savingRotina || !novaRotina.nome.trim()} className="btn-primary text-sm px-6">
                      {savingRotina ? 'Salvando...' : 'Criar Rotina'}
                    </button>
                    <button onClick={() => setShowNovaRotina(false)} className="btn-ghost text-sm">Cancelar</button>
                  </div>
                </div>
              )}

              {/* Rotina cards */}
              <div className="space-y-3">
                {rotinasFiltradas.map(rotina => (
                  <div key={rotina.id} className="card hover:shadow-card-hover transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => openRotina(rotina)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rotina.tipo === 'aerobico' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {rotina.tipo === 'aerobico' ? 'Aeróbico' : 'Musculação'}
                          </span>
                          <h4 className="font-bold text-secondary">{rotina.nome}</h4>
                        </div>
                        <p className="text-xs text-outline mt-1">
                          {rotina.data_inicio && rotina.data_fim
                            ? `${new Date(rotina.data_inicio + 'T00:00').toLocaleDateString('pt-BR')} → ${new Date(rotina.data_fim + 'T00:00').toLocaleDateString('pt-BR')} · ${calcDuracao(rotina.data_inicio, rotina.data_fim)}`
                            : 'Sem datas definidas'}
                          {' · '}{rotina.sessoes_treino.length} treino{rotina.sessoes_treino.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {rotinaView === 'ativa' && (
                          <>
                            <button onClick={() => openRotina(rotina)} title="Abrir" className="p-1.5 rounded text-outline hover:text-primary hover:bg-gray-100 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => arquivarRotina(rotina.id)} title="Arquivar" className="p-1.5 rounded text-outline hover:text-orange-500 hover:bg-orange-50 transition-colors"><Archive size={14} /></button>
                            <button onClick={() => excluirRotina(rotina.id)} title="Excluir" className="p-1.5 rounded text-outline hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </>
                        )}
                        {(rotinaView === 'arquivada' || rotinaView === 'excluida') && (
                          <button onClick={() => restaurarRotina(rotina.id)} title="Restaurar" className="p-1.5 rounded text-outline hover:text-green-600 hover:bg-green-50 transition-colors">
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {rotinasFiltradas.length === 0 && (
                  <div className="text-center py-16 text-outline">
                    <Dumbbell size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Nenhuma rotina {rotinaView === 'arquivada' ? 'arquivada' : rotinaView === 'excluida' ? 'excluída' : 'ativa'}</p>
                    {rotinaView === 'ativa' && <p className="text-sm mt-1">Clique em &quot;Criar Rotina&quot; para começar</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ── Rotina detail view
            <div>
              <button onClick={() => setSelectedRotina(null)} className="flex items-center gap-1 text-sm text-outline hover:text-secondary mb-4 transition-colors">
                <ChevronLeft size={16} /> Voltar às rotinas
              </button>

              {/* Rotina info card */}
              <div className="card mb-4">
                {editingRotina ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-secondary">Editar Rotina</h3>
                      <button onClick={() => setEditingRotina(false)} className="text-outline hover:text-secondary"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="label">Nome *</label>
                        <input className="input" value={editRotinaForm.nome} onChange={e => setEditRotinaForm(p => ({ ...p, nome: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Objetivo</label>
                        <input className="input" value={editRotinaForm.objetivo} onChange={e => setEditRotinaForm(p => ({ ...p, objetivo: e.target.value }))} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Orientações para o aluno</label>
                        <textarea className="input min-h-[60px]" value={editRotinaForm.orientacoes} onChange={e => setEditRotinaForm(p => ({ ...p, orientacoes: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Data início</label>
                        <input type="date" className="input" value={editRotinaForm.data_inicio} onChange={e => setEditRotinaForm(p => ({ ...p, data_inicio: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">
                          Data término
                          {editRotinaForm.data_inicio && editRotinaForm.data_fim && (
                            <span className="ml-2 text-primary font-semibold">{calcDuracao(editRotinaForm.data_inicio, editRotinaForm.data_fim)}</span>
                          )}
                        </label>
                        <input type="date" className="input" value={editRotinaForm.data_fim} onChange={e => setEditRotinaForm(p => ({ ...p, data_fim: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="edit-visivel" className="w-4 h-4" checked={editRotinaForm.visivel_antes_de_iniciar} onChange={e => setEditRotinaForm(p => ({ ...p, visivel_antes_de_iniciar: e.target.checked }))} />
                        <label htmlFor="edit-visivel" className="text-sm text-secondary cursor-pointer">Aluno pode ver antes de iniciar</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="edit-ocultar" className="w-4 h-4" checked={editRotinaForm.ocultar_ao_vencer} onChange={e => setEditRotinaForm(p => ({ ...p, ocultar_ao_vencer: e.target.checked }))} />
                        <label htmlFor="edit-ocultar" className="text-sm text-secondary cursor-pointer">Ocultar do aluno após o término</label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={saveEditRotina} disabled={savingEditRotina || !editRotinaForm.nome.trim()} className="btn-primary text-sm px-5">
                        {savingEditRotina ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingRotina(false)} className="btn-ghost text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedRotina.tipo === 'aerobico' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {selectedRotina.tipo === 'aerobico' ? 'Aeróbico' : 'Musculação'}
                        </span>
                        <h3 className="font-extrabold text-secondary text-lg">{selectedRotina.nome}</h3>
                      </div>
                      {selectedRotina.objetivo && <p className="text-sm text-secondary mt-1">Objetivo: {selectedRotina.objetivo}</p>}
                      {selectedRotina.data_inicio && selectedRotina.data_fim && (
                        <p className="text-xs text-outline mt-1">
                          {new Date(selectedRotina.data_inicio + 'T00:00').toLocaleDateString('pt-BR')} → {new Date(selectedRotina.data_fim + 'T00:00').toLocaleDateString('pt-BR')}
                          {' · '}{calcDuracao(selectedRotina.data_inicio, selectedRotina.data_fim)}
                          {' · '}<span className="font-semibold text-primary">{numSemanas} semanas</span>
                        </p>
                      )}
                      {selectedRotina.orientacoes && (
                        <p className="text-xs text-outline mt-1 italic">&quot;{selectedRotina.orientacoes}&quot;</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditRotinaForm({
                          nome: selectedRotina.nome,
                          objetivo: selectedRotina.objetivo ?? '',
                          orientacoes: selectedRotina.orientacoes ?? '',
                          data_inicio: selectedRotina.data_inicio ?? '',
                          data_fim: selectedRotina.data_fim ?? '',
                          visivel_antes_de_iniciar: selectedRotina.visivel_antes_de_iniciar,
                          ocultar_ao_vencer: selectedRotina.ocultar_ao_vencer,
                        })
                        setEditingRotina(true)
                      }}
                      className="p-1.5 rounded text-outline hover:text-primary hover:bg-gray-100 transition-colors flex-shrink-0"
                      title="Editar rotina"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Volume report (collapsible) */}
              {selectedRotina.tipo !== 'aerobico' && (() => {
                const { byGrupoSemana, grupos, semanas } = calcVolume(selectedRotina, exerciciosBiblioteca)
                if (grupos.length === 0) return null
                return (
                  <div className="card mb-4 border border-primary/20">
                    <button
                      onClick={() => setShowVolume(v => !v)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-primary" />
                        <span className="font-bold text-secondary text-sm">Volume por Grupo Muscular</span>
                      </div>
                      {showVolume ? <ChevronUp size={16} className="text-outline" /> : <ChevronDown size={16} className="text-outline" />}
                    </button>
                    {showVolume && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="text-xs w-full border-collapse">
                          <thead>
                            <tr className="border-b border-outline-variant">
                              <th className="text-left py-2 pr-4 text-outline font-semibold">Músculo</th>
                              {semanas.map(s => <th key={s} className="px-3 py-2 text-center text-outline font-semibold">S{s}</th>)}
                              <th className="px-3 py-2 text-center text-outline font-semibold">Média</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupos.map(g => {
                              const vals = semanas.map(s => byGrupoSemana[g]?.[s] ?? 0)
                              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
                              const maxVal = Math.max(...vals, 1)
                              return (
                                <tr key={g} className="border-b border-outline-variant last:border-0">
                                  <td className="py-2 pr-4 font-semibold text-secondary">{g}</td>
                                  {vals.map((v, i) => (
                                    <td key={i} className="px-3 py-2 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <div
                                          className="w-6 rounded-sm bg-primary/20"
                                          style={{ height: `${Math.max(4, (v / maxVal) * 24)}px`, backgroundColor: v > 0 ? `rgba(100,161,238,${0.3 + (v / maxVal) * 0.7})` : undefined }}
                                        />
                                        <span className={`font-medium ${v === 0 ? 'text-outline' : 'text-secondary'}`}>
                                          {v > 0 ? v.toFixed(1) : '–'}
                                        </span>
                                      </div>
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-center font-bold text-primary">{avg > 0 ? avg.toFixed(1) : '–'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <p className="text-[10px] text-outline mt-2">Séries por grupo muscular por semana (primário = 1×, secundário/terciário = peso definido na biblioteca)</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Sub-tabs */}
              <div className="flex gap-1 bg-white border border-outline-variant rounded-lg p-1 mb-4 w-fit">
                {(['Adicionar treino', `Treinos (${selectedRotina.sessoes_treino.length})`] as const).map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setRotinaSubTab(i as 0 | 1)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${rotinaSubTab === i ? 'bg-primary-dark text-white' : 'text-secondary hover:bg-gray-100'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Sub-tab 1: Treinos list */}
              {rotinaSubTab === 1 && (
                <div className="space-y-3">
                  {selectedRotina.sessoes_treino.length === 0 && (
                    <div className="text-center py-12 text-outline">
                      <p className="font-semibold">Nenhum treino nesta rotina</p>
                      <p className="text-sm mt-1">Use &quot;Adicionar treino&quot; para criar o primeiro</p>
                    </div>
                  )}
                  {[...selectedRotina.sessoes_treino]
                    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99))
                    .map((s, idx, arr) => (
                    <div key={s.id} className="card">
                      <div className="flex items-center gap-3">
                        {s.dia_letra && (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {s.dia_letra}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-secondary">{s.nome}</p>
                            {s.dia_semana_numero !== null && (
                              <span className="text-xs text-outline bg-gray-100 px-2 py-0.5 rounded">
                                {DIAS_SEMANA.find(d => d.value === String(s.dia_semana_numero))?.label}
                              </span>
                            )}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.tipo === 'aerobico' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {s.tipo === 'aerobico' ? (s.tipo_aerobico || 'Aeróbico') : 'Musculação'}
                            </span>
                          </div>
                          <p className="text-xs text-outline mt-0.5">
                            {s.tipo === 'aerobico'
                              ? (s.observacoes ? s.observacoes.slice(0, 60) + (s.observacoes.length > 60 ? '...' : '') : 'Treino aeróbico')
                              : `${s.sessao_itens.length} exercício${s.sessao_itens.length !== 1 ? 's' : ''}`}
                            {s.orientacoes_aluno && ` · ${s.orientacoes_aluno.slice(0, 40)}...`}
                          </p>
                        </div>
                        {/* Add exercise to existing sessão */}
                        {s.tipo !== 'aerobico' && (
                          <button
                            onClick={() => {
                              setAddingExToSessaoId(addingExToSessaoId === s.id ? null : s.id)
                              setAddExSearch('')
                              setAddExGrupo('')
                            }}
                            className={`p-1.5 rounded transition-colors flex-shrink-0 text-xs font-semibold flex items-center gap-1 ${addingExToSessaoId === s.id ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10 border border-primary/40'}`}
                            title="Adicionar exercício"
                          >
                            <Plus size={12} /> Exercício
                          </button>
                        )}
                        {/* Delete sessao */}
                        <button
                          onClick={() => deleteSessao(s.id)}
                          className="p-1.5 rounded text-outline hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Excluir treino"
                        >
                          <Trash2 size={14} />
                        </button>
                        {/* Reorder arrows */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moverSessao(s.id, 'up')}
                            disabled={idx === 0 || reordering}
                            className="p-1 rounded text-outline hover:text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            title="Mover para cima"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => moverSessao(s.id, 'down')}
                            disabled={idx === arr.length - 1 || reordering}
                            className="p-1 rounded text-outline hover:text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>

                      {addingExToSessaoId === s.id && (
                        <div className="mt-3 pt-3 border-t border-outline-variant">
                          <p className="text-xs font-bold text-secondary mb-2">Adicionar exercício a este treino</p>
                          <div className="flex gap-2 mb-2">
                            <input
                              className="input flex-1 text-sm py-1.5"
                              placeholder="Buscar exercício..."
                              value={addExSearch}
                              onChange={e => setAddExSearch(e.target.value)}
                            />
                            <select className="input text-sm py-1.5 w-40" value={addExGrupo} onChange={e => setAddExGrupo(e.target.value)}>
                              <option value="">Todos</option>
                              {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 border border-outline-variant rounded-lg p-1">
                            {exFiltradosAdd.slice(0, 25).map(ex => {
                              const alreadyIn = s.sessao_itens.some(i => i.exercicio?.id === ex.id)
                              return (
                                <button
                                  key={ex.id}
                                  onClick={() => addExToExistingSessao(s.id, ex)}
                                  disabled={alreadyIn || addingExLoading}
                                  className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${alreadyIn ? 'text-outline cursor-default' : 'hover:bg-gray-100 text-secondary'}`}
                                >
                                  <span className="font-medium">{ex.nome}</span>
                                  <span className="text-xs text-outline ml-2">{ex.grupo_muscular}</span>
                                  {alreadyIn && <span className="text-xs ml-1 text-green-600">✓</span>}
                                </button>
                              )
                            })}
                            {exFiltradosAdd.length === 0 && <p className="text-xs text-outline text-center py-3">Nenhum exercício encontrado</p>}
                          </div>
                        </div>
                      )}

                      {s.sessao_itens.length > 0 && (() => {
                        const sessaoSelectedCount = s.sessao_itens.filter(i => selectedItemIds.has(i.id)).length
                        return (
                        <div className="mt-3 pt-3 border-t border-outline-variant space-y-2">
                          {sessaoSelectedCount >= 2 && (
                            <div className="flex gap-2 pb-1">
                              <button
                                onClick={combinarItems}
                                className="flex-1 text-xs font-semibold text-white bg-primary rounded-lg px-3 py-1.5 hover:bg-primary-dark transition-colors"
                              >
                                Combinar bi-set
                              </button>
                              <button
                                onClick={() => setSelectedItemIds(new Set())}
                                className="text-xs text-outline hover:text-secondary px-2"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                          {s.sessao_itens.map((item, iIdx) => {
                            const pSemanas: SemanaItem[] = item.periodizacao_semanal ?? []
                            const isEditingThis = editingItemId === item.id
                            const isSelected = selectedItemIds.has(item.id)
                            const inBiset = !!item.biset_grupo
                            return (
                              <div key={item.id} className={`text-sm ${inBiset ? 'border-l-2 border-primary pl-2 rounded-r' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    checked={isSelected}
                                    onChange={e => setSelectedItemIds(prev => {
                                      const s = new Set(prev)
                                      e.target.checked ? s.add(item.id) : s.delete(item.id)
                                      return s
                                    })}
                                  />
                                  <span className="text-xs font-bold text-outline w-4">{iIdx + 1}.</span>
                                  <span className="font-medium text-secondary">{item.exercicio?.nome ?? '–'}</span>
                                  <span className="text-xs text-outline bg-gray-100 px-1.5 py-0.5 rounded">{item.exercicio?.grupo_muscular}</span>
                                  {inBiset && (
                                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Bi-set</span>
                                  )}
                                  <div className="ml-auto flex items-center gap-1">
                                    {inBiset && (
                                      <button
                                        onClick={() => descombinarGrupo(item.biset_grupo!)}
                                        className="p-1 rounded text-xs text-outline hover:text-orange-500 hover:bg-orange-50 transition-colors"
                                        title="Desagrupar bi-set"
                                      >
                                        <X size={11} />
                                      </button>
                                    )}
                                    <button onClick={() => isEditingThis ? setEditingItemId(null) : startEditItem(item)} className={`p-1 rounded text-xs transition-colors ${isEditingThis ? 'text-primary' : 'text-outline hover:text-primary hover:bg-gray-100'}`} title="Editar">
                                      <Edit2 size={11} />
                                    </button>
                                    <button onClick={() => deleteItem(s.id, item.id)} className="p-1 rounded text-outline hover:text-red-500 hover:bg-red-50 transition-colors" title="Remover">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {isEditingThis ? (
                                  <div className="ml-7 bg-background rounded-lg p-3">
                                    {/* Exercise swap */}
                                    <div className="mb-3 relative">
                                      <label className="text-xs font-semibold text-outline mb-1 block">Exercício</label>
                                      <input
                                        className="input text-xs py-1"
                                        value={editItemExSearch !== '' ? editItemExSearch : editItemExNome}
                                        onChange={e => { setEditItemExSearch(e.target.value); setEditItemExNome(e.target.value) }}
                                        placeholder="Digitar para trocar exercício..."
                                      />
                                      {editItemExSearch !== '' && (
                                        <div className="absolute left-0 right-0 top-full mt-0.5 border border-outline-variant rounded-lg bg-white shadow-md z-10 max-h-36 overflow-y-auto">
                                          {exerciciosBiblioteca
                                            .filter(e => e.nome.toLowerCase().includes(editItemExSearch.toLowerCase()))
                                            .slice(0, 10)
                                            .map(e => (
                                              <button key={e.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 text-secondary" onClick={() => { setEditItemExId(e.id); setEditItemExNome(e.nome); setEditItemExSearch('') }}>
                                                <span className="font-medium">{e.nome}</span>
                                                <span className="text-outline ml-1 text-[10px]">({e.grupo_muscular})</span>
                                              </button>
                                            ))}
                                          {exerciciosBiblioteca.filter(e => e.nome.toLowerCase().includes(editItemExSearch.toLowerCase())).length === 0 && (
                                            <p className="text-xs text-outline text-center py-2">Nenhum encontrado</p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Periodization table */}
                                    <div className="overflow-x-auto mb-2">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr>
                                            <th className="text-left text-outline pr-2 py-1 w-14"></th>
                                            {editItemPeriod.map(p => <th key={p.semana} className="text-center text-outline px-1 py-1 min-w-[56px]">S{p.semana}</th>)}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(['series', 'repeticoes', 'carga_kg'] as const).map(field => (
                                            <tr key={field}>
                                              <td className="text-outline pr-2 py-0.5">{field === 'carga_kg' ? 'Carga' : field === 'series' ? 'Séries' : 'Reps'}</td>
                                              {editItemPeriod.map((p, pi) => (
                                                <td key={p.semana} className="px-1 py-0.5">
                                                  <input
                                                    className="w-full text-center border border-outline-variant rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                                                    value={(p as any)[field]}
                                                    onChange={e => setEditItemPeriod(prev => prev.map((x, xi) => xi === pi ? { ...x, [field]: e.target.value } : x))}
                                                    placeholder="–"
                                                  />
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                          <tr>
                                            <td className="text-outline pr-2 py-1">Obs.</td>
                                            <td colSpan={editItemPeriod.length} className="py-1 px-1">
                                              <input
                                                className="w-full border border-outline-variant rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary"
                                                value={editItemObs}
                                                onChange={e => setEditItemObs(e.target.value)}
                                                placeholder="Observação visível ao aluno..."
                                              />
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Descanso */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <Clock size={12} className="text-outline flex-shrink-0" />
                                      <label className="text-xs text-outline">Intervalo</label>
                                      <input
                                        type="number"
                                        className="border border-outline-variant rounded px-2 py-0.5 text-xs w-16 focus:outline-none focus:border-primary text-center"
                                        value={editItemDescanso}
                                        onChange={e => setEditItemDescanso(e.target.value)}
                                        placeholder="90"
                                      />
                                      <span className="text-xs text-outline">seg</span>
                                    </div>

                                    {/* Método de treino */}
                                    <div className="mb-3">
                                      <label className="text-xs font-semibold text-outline mb-1 block">Método de treino</label>
                                      <select
                                        className="input text-xs py-1"
                                        value={editItemMetodo}
                                        onChange={e => {
                                          const m = e.target.value
                                          setEditItemMetodo(m)
                                          setEditItemMetodoParams({})
                                          const techMethods = ['pausa_excentrica', 'pico_contracao', 'reps_parciais', 'descanso_especifico']
                                          if (techMethods.includes(m)) {
                                            setEditItemObs(applyMetodoTemplate(m, {}))
                                          }
                                        }}
                                      >
                                        <option value="">— Nenhum —</option>
                                        <optgroup label="Métodos Estruturais">
                                          <option value="cluster_set">Cluster Set</option>
                                          <option value="rest_pause">Rest Pause</option>
                                          <option value="drop_set">Drop Set</option>
                                          <option value="back_off_set">Back Off Set</option>
                                        </optgroup>
                                        <optgroup label="Instruções Técnicas">
                                          <option value="pausa_excentrica">Pausa Excêntrica</option>
                                          <option value="pico_contracao">Pico de Contração</option>
                                          <option value="reps_parciais">Repetições Parciais</option>
                                          <option value="descanso_especifico">Descanso Específico</option>
                                        </optgroup>
                                      </select>

                                      {editItemMetodo === 'cluster_set' && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                          {[['blocos', 'Blocos'], ['reps_bloco', 'Reps/bloco'], ['descanso', 'Descanso (s)']].map(([k, label]) => (
                                            <div key={k} className="flex flex-col gap-0.5">
                                              <span className="text-[10px] text-outline">{label}</span>
                                              <input className="input text-xs py-0.5 w-20" value={editItemMetodoParams[k] ?? ''} onChange={e => { const p = { ...editItemMetodoParams, [k]: e.target.value }; setEditItemMetodoParams(p); setEditItemObs(applyMetodoTemplate('cluster_set', p)) }} placeholder="?" />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {editItemMetodo === 'rest_pause' && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                          {[['r1', 'Reps 1'], ['r2', 'Reps 2'], ['r3', 'Reps 3'], ['descanso', 'Descanso (s)']].map(([k, label]) => (
                                            <div key={k} className="flex flex-col gap-0.5">
                                              <span className="text-[10px] text-outline">{label}</span>
                                              <input className="input text-xs py-0.5 w-16" value={editItemMetodoParams[k] ?? ''} onChange={e => { const p = { ...editItemMetodoParams, [k]: e.target.value }; setEditItemMetodoParams(p); setEditItemObs(applyMetodoTemplate('rest_pause', p)) }} placeholder="?" />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {(editItemMetodo === 'drop_set' || editItemMetodo === 'back_off_set') && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-outline">% redução</span>
                                            <input className="input text-xs py-0.5 w-20" value={editItemMetodoParams['pct'] ?? ''} onChange={e => { const p = { ...editItemMetodoParams, pct: e.target.value }; setEditItemMetodoParams(p); setEditItemObs(applyMetodoTemplate(editItemMetodo, p)) }} placeholder="?" />
                                          </div>
                                          {editItemMetodo === 'back_off_set' && (
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[10px] text-outline">Descanso extra (s)</span>
                                              <input className="input text-xs py-0.5 w-24" value={editItemMetodoParams['descanso'] ?? ''} onChange={e => { const p = { ...editItemMetodoParams, descanso: e.target.value }; setEditItemMetodoParams(p); setEditItemObs(applyMetodoTemplate('back_off_set', p)) }} placeholder="?" />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {['pausa_excentrica', 'pico_contracao', 'reps_parciais', 'descanso_especifico'].includes(editItemMetodo) && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-outline">{editItemMetodo === 'reps_parciais' ? 'Reps parciais' : 'Segundos'}</span>
                                            <input className="input text-xs py-0.5 w-20" value={editItemMetodoParams[editItemMetodo === 'reps_parciais' ? 'reps' : 'seg'] ?? ''} onChange={e => { const key = editItemMetodo === 'reps_parciais' ? 'reps' : 'seg'; const p = { ...editItemMetodoParams, [key]: e.target.value }; setEditItemMetodoParams(p); setEditItemObs(applyMetodoTemplate(editItemMetodo, p)) }} placeholder={editItemMetodo === 'pausa_excentrica' ? '3' : editItemMetodo === 'pico_contracao' ? '2' : editItemMetodo === 'reps_parciais' ? '4' : '90'} />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <button onClick={() => saveEditItem(s.id, item.id)} disabled={savingItem} className="text-xs font-semibold text-white bg-primary px-3 py-1 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                                        {savingItem ? '...' : 'Salvar'}
                                      </button>
                                      <button onClick={() => setEditingItemId(null)} className="text-xs text-outline hover:text-secondary">Cancelar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {item.observacoes && (
                                      <p className="ml-7 text-xs text-primary mb-1">💡 {item.observacoes}</p>
                                    )}
                                    {pSemanas.length > 0 ? (
                                      <div className="ml-7 overflow-x-auto">
                                        <table className="text-xs border-collapse">
                                          <thead>
                                            <tr>
                                              <th className="pr-3 py-0.5 text-left text-outline font-semibold"></th>
                                              {pSemanas.map(p => (
                                                <th key={p.semana} className="px-2 py-0.5 text-outline font-semibold text-center">S{p.semana}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(['series', 'repeticoes', 'carga_kg'] as const).map(field => (
                                              <tr key={field}>
                                                <td className="pr-3 py-0.5 text-outline capitalize">{field === 'carga_kg' ? 'Carga' : field === 'series' ? 'Séries' : 'Reps'}</td>
                                                {pSemanas.map(p => (
                                                  <td key={p.semana} className="px-2 py-0.5 text-center text-secondary font-medium">
                                                    {(p as any)[field] || '–'}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="ml-7 text-xs text-outline">
                                        {item.series && `${item.series}x`}{item.repeticoes && ` ${item.repeticoes}`}{item.carga_kg && ` @ ${item.carga_kg}kg`}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 0: Add workout day */}
              {rotinaSubTab === 0 && (
                <div className="card">
                  <h3 className="font-extrabold text-secondary mb-4">Novo Dia de Treino</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="label">Letra</label>
                      <select className="input" value={novaDia.dia_letra} onChange={e => setNovaDia(p => ({ ...p, dia_letra: e.target.value }))}>
                        {DIA_LETRAS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Dia da semana</label>
                      <select className="input" value={novaDia.dia_semana_numero} onChange={e => setNovaDia(p => ({ ...p, dia_semana_numero: e.target.value }))}>
                        {DIAS_SEMANA.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    {tab === 0 && (
                      <div>
                        <label className="label">Tipo</label>
                        <select className="input" value={novaDia.tipo} onChange={e => setNovaDia(p => ({ ...p, tipo: e.target.value }))}>
                          <option value="musculacao">Musculação</option>
                          <option value="aerobico">Aeróbico</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="label">Nome (opcional)</label>
                      <input className="input" placeholder={`Treino ${novaDia.dia_letra}`} value={novaDia.nome} onChange={e => setNovaDia(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="label">Orientações para o aluno (opcional)</label>
                    <textarea className="input min-h-[60px]" placeholder="Instruções específicas deste treino..." value={novaDia.orientacoes_aluno} onChange={e => setNovaDia(p => ({ ...p, orientacoes_aluno: e.target.value }))} />
                  </div>

                  {/* Aerobico: tipo + description */}
                  {(tab === 1 || novaDia.tipo === 'aerobico') && (
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="label">{tab === 1 ? 'Modalidade' : 'Tipo de treino aeróbico'}</label>
                        <select className="input" value={novaDia.tipo_aerobico} onChange={e => setNovaDia(p => ({ ...p, tipo_aerobico: e.target.value }))}>
                          <option value="">— Selecionar —</option>
                          {(tab === 1 ? MODALIDADES_AEROBICO : TIPOS_AEROBICO).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Descrição do treino</label>
                        <textarea className="input min-h-[100px]" placeholder="Descreva o treino: distância, pace, zonas de esforço, séries de tiros, etc." value={novaDia.descricao_aerobico} onChange={e => setNovaDia(p => ({ ...p, descricao_aerobico: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {/* Musculacao: exercise picker + periodization */}
                  {tab === 0 && novaDia.tipo === 'musculacao' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="label">Semanas de periodização</p>
                        <div className="flex items-center gap-2">
                          {selectedRotina?.data_inicio && selectedRotina?.data_fim && (
                            <span className="text-xs text-primary font-semibold">
                              ({calcDuracao(selectedRotina.data_inicio, selectedRotina.data_fim)})
                            </span>
                          )}
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(12, Math.max(6, numSemanas)) }, (_, i) => i + 1).map(n => (
                              <button
                                key={n}
                                onClick={() => updateNumSemanas(n)}
                                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${numSemanas === n ? 'bg-primary text-white' : 'bg-gray-100 text-secondary hover:bg-gray-200'}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Added exercises */}
                      {sessaoItens.length > 0 && (
                        <div className="mb-4 space-y-3">
                          {sessaoItens.map((item, idx) => (
                            <div key={item.key} className="bg-background rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-outline">{idx + 1}.</span>
                                  <span className="font-semibold text-secondary text-sm">{item.nome}</span>
                                  <span className="text-xs text-outline bg-white px-1.5 py-0.5 rounded">{item.grupo_muscular}</span>
                                </div>
                                <button onClick={() => removeItem(item.key)} className="p-1 text-outline hover:text-red-500"><X size={14} /></button>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="text-left text-outline pr-2 py-1 w-16"></th>
                                      {item.periodizacao.map(p => (
                                        <th key={p.semana} className="text-center text-outline px-1 py-1 min-w-[60px]">
                                          <div>S{p.semana}</div>
                                          {MC_MODELO[p.semana - 1] && <div className="text-[9px] font-normal opacity-60 leading-tight">{MC_MODELO[p.semana - 1].fase}</div>}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(['series', 'repeticoes', 'carga_kg'] as const).map(field => (
                                      <tr key={field}>
                                        <td className="text-outline pr-2 py-0.5 text-xs capitalize">{field === 'carga_kg' ? 'Carga' : field === 'series' ? 'Séries' : 'Reps'}</td>
                                        {item.periodizacao.map(p => (
                                          <td key={p.semana} className="px-1 py-0.5">
                                            <input
                                              className="w-full text-center border border-outline-variant rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                                              value={(p as any)[field]}
                                              onChange={e => updatePeriod(item.key, p.semana, field, e.target.value)}
                                              placeholder="–"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                    <tr>
                                      <td className="text-outline pr-2 py-1 text-xs">Obs.</td>
                                      <td colSpan={item.periodizacao.length} className="py-1 px-1">
                                        <input
                                          className="w-full border border-outline-variant rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary"
                                          value={item.observacoes}
                                          onChange={e => updateItemField(item.key, 'observacoes', e.target.value)}
                                          placeholder="Observações do exercício (visível ao aluno)..."
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="text-outline pr-2 py-1 text-xs flex items-center gap-1"><Clock size={11} className="text-outline flex-shrink-0" />Interv.</td>
                                      <td colSpan={item.periodizacao.length} className="py-1 px-1">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            className="w-16 border border-outline-variant rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary text-center"
                                            value={item.descanso_seg}
                                            onChange={e => updateItemField(item.key, 'descanso_seg', e.target.value)}
                                            placeholder="90"
                                          />
                                          <span className="text-[10px] text-outline">seg</span>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="text-outline pr-2 py-1 text-xs">Método</td>
                                      <td colSpan={item.periodizacao.length} className="py-1 px-1">
                                        <select
                                          className="w-full border border-outline-variant rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary"
                                          value={item.metodo}
                                          onChange={e => {
                                            const m = e.target.value
                                            const techMethods = ['pausa_excentrica', 'pico_contracao', 'reps_parciais', 'descanso_especifico']
                                            const obs = techMethods.includes(m) ? applyMetodoTemplate(m, {}) : item.observacoes
                                            updateItemMetodo(item.key, m, {}, obs)
                                          }}
                                        >
                                          <option value="">— Nenhum —</option>
                                          <optgroup label="Métodos Estruturais">
                                            <option value="cluster_set">Cluster Set</option>
                                            <option value="rest_pause">Rest Pause</option>
                                            <option value="drop_set">Drop Set</option>
                                            <option value="back_off_set">Back Off Set</option>
                                          </optgroup>
                                          <optgroup label="Instruções Técnicas">
                                            <option value="pausa_excentrica">Pausa Excêntrica</option>
                                            <option value="pico_contracao">Pico de Contração</option>
                                            <option value="reps_parciais">Repetições Parciais</option>
                                            <option value="descanso_especifico">Descanso Específico</option>
                                          </optgroup>
                                        </select>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Exercise selector */}
                      <div className="border border-outline-variant rounded-xl p-3">
                        <p className="label mb-2">Adicionar exercício</p>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <input
                            className="input flex-1 text-sm py-1.5"
                            placeholder="Buscar exercício..."
                            value={searchEx}
                            onChange={e => setSearchEx(e.target.value)}
                          />
                          <select className="input text-sm py-1.5" value={grupoFilter} onChange={e => setGrupoFilter(e.target.value)}>
                            <option value="">Todos os grupos</option>
                            {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {exFiltrados.slice(0, 30).map(ex => {
                            const added = sessaoItens.some(i => i.exercicio_id === ex.id)
                            return (
                              <button
                                key={ex.id}
                                onClick={() => addExercicio(ex)}
                                disabled={added}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${added ? 'bg-green-50 text-green-700 cursor-default' : 'hover:bg-gray-100 text-secondary'}`}
                              >
                                <span className="font-medium">{ex.nome}</span>
                                <span className="text-xs text-outline ml-2">{ex.grupo_muscular}</span>
                                {added && <span className="text-xs ml-auto float-right">✓ Adicionado</span>}
                              </button>
                            )
                          })}
                          {exFiltrados.length === 0 && <p className="text-xs text-outline text-center py-4">Nenhum exercício encontrado</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={createSessaoDia}
                      disabled={savingDia || (novaDia.tipo === 'musculacao' && sessaoItens.length === 0)}
                      className="btn-primary text-sm px-6"
                    >
                      {savingDia ? 'Salvando...' : 'Salvar Treino'}
                    </button>
                    <button onClick={() => setRotinaSubTab(1)} className="btn-ghost text-sm">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Dados ───────────────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-secondary">Dados Pessoais</h3>
              {!editingDados ? (
                <button onClick={() => setEditingDados(true)} className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
                  <Edit2 size={12} /> Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingDados(false)} className="text-xs text-outline hover:text-secondary">Cancelar</button>
                  <button onClick={saveDados} disabled={savingDados} className="text-xs font-semibold text-white bg-primary px-3 py-1 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {savingDados ? '...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {editingDados ? (
              <div className="space-y-3">
                {[
                  { label: 'Nome', field: 'nome', type: 'text' },
                  { label: 'Telefone', field: 'telefone', type: 'text' },
                  { label: 'Nascimento', field: 'data_nascimento', type: 'date' },
                  { label: 'Objetivo', field: 'objetivo', type: 'text' },
                  { label: 'Horário de contato', field: 'horario_contato_preferido', type: 'text' },
                  { label: 'Horário de treino', field: 'horario_treino', type: 'text' },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="label">{label}</label>
                    <input
                      className="input"
                      type={type}
                      value={(dadosForm as any)[field]}
                      onChange={e => setDadosForm(prev => ({ ...prev, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="label">Plano</label>
                  <select className="input" value={dadosForm.plano_contratado} onChange={e => setDadosForm(p => ({ ...p, plano_contratado: e.target.value }))}>
                    <option value="">Selecione...</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Semi-presencial">Semi-presencial</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Família">Família</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor (R$)</label>
                  <input className="input" type="number" value={dadosForm.valor_plano} onChange={e => setDadosForm(p => ({ ...p, valor_plano: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data início</label>
                    <input className="input" type="date" value={dadosForm.data_inicio} onChange={e => setDadosForm(p => ({ ...p, data_inicio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Renovação</label>
                    <input className="input" type="date" value={dadosForm.data_renovacao} onChange={e => setDadosForm(p => ({ ...p, data_renovacao: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Nível</label>
                  <select className="input" value={dadosForm.nivel} onChange={e => setDadosForm(p => ({ ...p, nivel: e.target.value }))}>
                    <option value="">Selecione...</option>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
                <div>
                  <label className="label">Frequência/semana</label>
                  <select className="input" value={dadosForm.disciplina} onChange={e => setDadosForm(p => ({ ...p, disciplina: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {['2x','3x','4x','5x','6x+'].map(v => <option key={v} value={v}>{v} por semana</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Academia</label>
                  <select className="input" value={dadosForm.academia_id} onChange={e => setDadosForm(p => ({ ...p, academia_id: e.target.value }))}>
                    <option value="">Sem academia associada</option>
                    {academias.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                {[
                  ['E-mail', aluno.usuario?.email],
                  ['Telefone', aluno.usuario?.telefone],
                  ['Nascimento', aluno.usuario?.data_nascimento ? new Date(aluno.usuario.data_nascimento + 'T00:00').toLocaleDateString('pt-BR') : null],
                  ['Plano', aluno.plano_contratado],
                  ['Valor', aluno.valor_plano ? `R$ ${aluno.valor_plano}` : null],
                  ['Contato preferido', aluno.horario_contato_preferido],
                  ['Nível', aluno.nivel],
                  ['Autonomia', aluno.autonomia],
                  ['Frequência', aluno.disciplina],
                  ['Horário', aluno.horario_treino],
                  ['Academia', aluno.academia?.nome],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4">
                    <dt className="text-xs font-semibold text-outline uppercase tracking-wider">{k}</dt>
                    <dd className="text-sm text-secondary text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Perfil Comportamental</h3>
            {aluno.perfil_comportamental?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {aluno.perfil_comportamental.map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-blue-50 text-primary text-xs font-semibold rounded-full">{t}</span>
                ))}
              </div>
            )}
            <dl className="space-y-2">
              {[['Motivação', aluno.motivacao_principal], ['Dificuldade', aluno.dificuldade_principal]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs font-semibold text-outline uppercase tracking-wider">{k}</dt>
                  <dd className="text-sm text-secondary mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-3">Ações do Administrador</p>
              <div className="space-y-2">
                <button onClick={() => { setTab(4); }} className="btn-secondary text-xs py-2 px-3 justify-center w-full">
                  <Plus size={14} /> Nova Anotação
                </button>
                <button onClick={() => { setShowResetModal(true); setResetMsg('') }} className="btn-secondary text-xs py-2 px-3 justify-center w-full">
                  <KeyRound size={14} /> Redefinir Senha
                </button>
                {alunoStatus === 'ativo' ? (
                  <button
                    onClick={inativarAluno}
                    disabled={statusLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition-colors"
                  >
                    <UserX size={14} /> {statusLoading ? '...' : 'Inativar aluno'}
                  </button>
                ) : (
                  <button
                    onClick={ativarAluno}
                    disabled={statusLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
                  >
                    <UserCheck size={14} /> {statusLoading ? '...' : 'Ativar aluno'}
                  </button>
                )}
                <button
                  onClick={excluirAluno}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} /> Excluir aluno definitivamente
                </button>
              </div>
            </div>
          </div>

          {/* Academias com Acesso — item 15 */}
          {academias.length > 0 && (
            <div className="card md:col-span-2">
              <h3 className="font-extrabold text-secondary mb-1">Academias com Acesso</h3>
              <p className="text-xs text-outline mb-4">Academia principal definida nos dados pessoais. Marque abaixo para liberar acesso a academias adicionais.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {academias.map(a => {
                  const isPrimary = a.id === dadosForm.academia_id || a.id === aluno.academia?.id
                  const isExtra = academiasExtras.has(a.id)
                  const isSaving = savingAcademia === a.id
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors ${isPrimary ? 'bg-primary/10 border border-primary/30' : isExtra ? 'bg-green-50 border border-green-200' : 'bg-background border border-transparent'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-secondary truncate">{a.nome}</span>
                        {isPrimary && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">Principal</span>}
                      </div>
                      {!isPrimary && (
                        <button
                          onClick={() => toggleAcademiaExtra(a.id)}
                          disabled={!!isSaving}
                          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isExtra ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-outline hover:bg-primary/10 hover:text-primary'}`}
                        >
                          {isSaving ? '...' : isExtra ? 'Remover acesso' : 'Liberar acesso'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Ficha Saúde ─────────────────────────────────────────────── */}
      {tab === 3 && (
        <div className="card">
          <h3 className="font-extrabold text-secondary mb-4">Ficha de Saúde</h3>
          <div className="space-y-4">
            {[
              ['Dores e Lesões', aluno.dores_lesoes],
              ['Limitações', aluno.limitacoes],
              ['Exercícios que Incomodam', aluno.exercicios_que_incomodam],
              ['Exercícios Preferidos', aluno.exercicios_preferidos],
              ['Exercícios que Odeia', aluno.exercicios_que_odeia],
              ['Pontos de Atenção', aluno.pontos_atencao],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} className="bg-background rounded-lg p-4">
                <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1">{k}</p>
                <p className="text-sm text-secondary">{v}</p>
              </div>
            ))}
            {![aluno.dores_lesoes, aluno.limitacoes, aluno.exercicios_que_incomodam].some(Boolean) && (
              <p className="text-sm text-outline text-center py-8">Nenhuma informação de saúde registrada.</p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Anotações ───────────────────────────────────────────────── */}
      {tab === 4 && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Nova Anotação</h3>
            <textarea
              className="input min-h-[100px]"
              placeholder="Adicione uma anotação privada sobre este aluno..."
              value={novaNota}
              onChange={e => setNovaNota(e.target.value)}
            />
            <button onClick={saveNota} disabled={savingNota || !novaNota.trim()} className="btn-primary mt-3 text-sm px-6">
              {savingNota ? 'Salvando...' : 'Salvar Anotação'}
            </button>
            {notaError && <p className="text-xs text-red-500 mt-2">{notaError}</p>}
          </div>
          {anotacoesList.map((a: any) => (
            <div key={a.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-primary">{a.tipo}</span>
                  <span className="text-xs text-outline">
                    {new Date(a.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {a.autor?.nome && ` · ${a.autor.nome}`}
                  </span>
                </div>
                <button onClick={() => deleteNota(a.id)} className="p-1 text-outline hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-secondary">{a.texto}</p>
            </div>
          ))}
          {anotacoesList.length === 0 && (
            <p className="text-sm text-outline text-center py-8">Nenhuma anotação registrada.</p>
          )}
        </div>
      )}

      {/* ── TAB 5: Feedbacks ───────────────────────────────────────────────── */}
      {tab === 5 && (
        <div className="space-y-4">
          {feedbacks_semanais.map((f: any) => (
            <div key={f.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-secondary">Semana de {new Date(f.semana_referencia + 'T00:00').toLocaleDateString('pt-BR')}</h4>
                {f.aderencia_0_10 !== null && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${f.aderencia_0_10 >= 7 ? 'bg-green-50 text-green-700' : f.aderencia_0_10 >= 5 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                    Aderência: {f.aderencia_0_10}/10
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {f.treinos_feitos !== null && <p><span className="font-semibold">Treinos:</span> {f.treinos_feitos}</p>}
                {f.cardios_feitos !== null && <p><span className="font-semibold">Cárdios:</span> {f.cardios_feitos}</p>}
                {f.energia && <p><span className="font-semibold">Energia:</span> {f.energia}</p>}
                {f.peso_atual && <p><span className="font-semibold">Peso:</span> {f.peso_atual} kg</p>}
              </div>
              {f.sentiu_dor && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700"><AlertCircle size={12} className="inline mr-1" />Dor relatada: {f.descricao_dor}</div>}
              {f.duvida_semana && <p className="mt-2 text-sm text-secondary"><span className="font-semibold">Dúvida:</span> {f.duvida_semana}</p>}
            </div>
          ))}
          {feedbacks_semanais.length === 0 && <p className="text-sm text-outline text-center py-8">Nenhum feedback semanal enviado.</p>}
        </div>
      )}

      {/* ── TAB 6: Score / Evolução ─────────────────────────────────────────── */}
      {tab === 6 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Evolução de Carga</h3>
            <div className="flex items-end justify-center gap-2 h-32">
              {[40, 50, 55, 60, 65, 70, 75].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-outline">{v}kg</span>
                  <div className={`w-8 rounded-t-sm ${i === 6 ? 'bg-primary-dark' : 'bg-primary opacity-60'}`} style={{ height: `${(v / 75) * 80}px` }} />
                  <span className="text-[10px] text-outline">S{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Aderência ao Treino</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e1e2e9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E6FD9" strokeWidth="3" strokeDasharray={`${aderencia} ${100 - aderencia}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-primary-dark">{aderencia.toFixed(0)}%</span>
                  <span className="text-[10px] text-outline">este mês</span>
                </div>
              </div>
            </div>
          </div>
          {aluno.aluno_badges?.length > 0 && (
            <div className="card md:col-span-2">
              <h3 className="font-extrabold text-secondary mb-4">Conquistas e Badges</h3>
              <div className="flex flex-wrap gap-3">
                {aluno.aluno_badges.map((ab: any) => (
                  <div key={ab.badge.id} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-xl">
                    <span className="text-xl">{ab.badge.icone}</span>
                    <div>
                      <p className="text-xs font-bold text-yellow-800">{ab.badge.nome}</p>
                      <p className="text-[10px] text-yellow-600">{new Date(ab.conquistado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Password reset modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-secondary">Redefinir Senha</h3>
              <button onClick={() => setShowResetModal(false)} className="text-outline hover:text-secondary"><X size={20} /></button>
            </div>
            <p className="text-sm text-outline mb-4">Aluno: <span className="font-semibold text-secondary">{nome}</span></p>
            <div className="space-y-4">
              <div>
                <label className="label">Nova senha</label>
                <input type="text" className="input" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
              </div>
              {resetMsg && <p className={`text-sm px-3 py-2 rounded-lg ${resetMsg.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{resetMsg}</p>}
              <button onClick={resetSenha} disabled={resetLoading} className="btn-primary w-full justify-center">
                {resetLoading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
