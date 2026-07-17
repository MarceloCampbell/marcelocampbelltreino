'use client'

import { useState } from 'react'
import { Plus, Building2, Dumbbell, Check, X, List, Grid, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Academia = {
  id: string
  nome: string
  endereco: string | null
  observacoes: string | null
  status: string
  academia_equipamentos: { id: string; nome_equipamento: string }[]
  exercicio_academias: { id: string; disponivel: boolean; exercicio: { id: string; nome: string; grupo_muscular: string } | null }[]
  alunos: { id: string; usuario: { nome: string } | null }[]
}

type Exercicio = { id: string; nome: string; grupo_muscular: string; categoria: string }

export function AcademiasClient({ academias: initial, exercicios }: { academias: Academia[]; exercicios: Exercicio[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [academias, setAcademias] = useState(initial)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showNewForm, setShowNewForm] = useState(false)
  const [selected, setSelected] = useState<Academia | null>(null)
  const [newAcademia, setNewAcademia] = useState({ nome: '', endereco: '', observacoes: '' })
  const [novoEquip, setNovoEquip] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedAlunos, setExpandedAlunos] = useState<string | null>(null)

  async function createAcademia() {
    setSaving(true)
    const { data } = await supabase.from('academias').insert({
      nome: newAcademia.nome,
      endereco: newAcademia.endereco || null,
      observacoes: newAcademia.observacoes || null,
    }).select('*, academia_equipamentos(*), exercicio_academias(*, exercicio:exercicios(id, nome, grupo_muscular))').single()
    if (data) {
      setAcademias(prev => [...prev, data])
      setNewAcademia({ nome: '', endereco: '', observacoes: '' })
      setShowNewForm(false)
    }
    setSaving(false)
  }

  async function addEquipamento(acadId: string) {
    if (!novoEquip.trim()) return
    await supabase.from('academia_equipamentos').insert({ academia_id: acadId, nome_equipamento: novoEquip })
    setNovoEquip('')
    router.refresh()
  }

  async function deleteAcademia(acadId: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('academias').delete().eq('id', acadId)
    if (!error) {
      setAcademias(prev => prev.filter(a => a.id !== acadId))
      if (selected?.id === acadId) setSelected(null)
    }
  }

  async function toggleDisponibilidade(acadId: string, exId: string, disponivel: boolean) {
    const existing = academias.find(a => a.id === acadId)?.exercicio_academias?.find(ea => ea.exercicio?.id === exId)
    if (existing) {
      await supabase.from('exercicio_academias').update({ disponivel: !disponivel }).eq('id', existing.id)
    } else {
      await supabase.from('exercicio_academias').insert({ academia_id: acadId, exercicio_id: exId, disponivel: true })
    }

    // Update local state without relying on router.refresh() which doesn't update useState
    const updateAcad = (a: Academia): Academia => {
      if (a.id !== acadId) return a
      const hasEntry = a.exercicio_academias.find(ea => ea.exercicio?.id === exId)
      return {
        ...a,
        exercicio_academias: hasEntry
          ? a.exercicio_academias.map(ea =>
              ea.exercicio?.id === exId ? { ...ea, disponivel: !disponivel } : ea
            )
          : [
              ...a.exercicio_academias,
              { id: crypto.randomUUID(), disponivel: true, exercicio: exercicios.find(e => e.id === exId) ?? null },
            ],
      }
    }
    setAcademias(prev => prev.map(updateAcad))
    setSelected(prev => (prev ? updateAcad(prev) : null))
  }

  const statusColor = (s: string) => s === 'ativo' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary'}`}><Grid size={16} /></button>
          <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary'}`}><List size={16} /></button>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm px-4 py-2">
          <Plus size={16} /> Cadastrar Academia
        </button>
      </div>

      {/* New academia form */}
      {showNewForm && (
        <div className="card mb-6 border-2 border-primary">
          <h3 className="font-extrabold text-secondary mb-4">Nova Academia</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome *</label>
              <input className="input" placeholder="Ex: SmartFit Paulista" value={newAcademia.nome} onChange={e => setNewAcademia(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="label">Endereço</label>
              <input className="input" placeholder="Rua, número" value={newAcademia.endereco} onChange={e => setNewAcademia(p => ({ ...p, endereco: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <input className="input" placeholder="Horário, contato..." value={newAcademia.observacoes} onChange={e => setNewAcademia(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createAcademia} disabled={saving || !newAcademia.nome} className="btn-primary text-sm px-6">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowNewForm(false)} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Academias grid */}
      <div className={`grid gap-4 mb-8 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
        {academias.map(academia => {
          const isSelected = selected?.id === academia.id
          const equipCount = academia.academia_equipamentos?.length ?? 0
          const exAvail = academia.exercicio_academias?.filter(ea => ea.disponivel).length ?? 0
          const alunoList = academia.alunos ?? []
          const alunoCount = alunoList.length
          const showAlunos = expandedAlunos === academia.id

          return (
            <div key={academia.id} className={`card transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-card-hover'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="cursor-pointer flex-1" onClick={() => setSelected(isSelected ? null : academia)}>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">{academia.status}</span>
                  <h3 className="font-extrabold text-secondary text-lg">{academia.nome}</h3>
                  {academia.endereco && <p className="text-xs text-outline">{academia.endereco}</p>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteAcademia(academia.id, academia.nome) }}
                  className="p-1 text-outline hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <button
                  onClick={() => setExpandedAlunos(showAlunos ? null : academia.id)}
                  className="bg-background rounded-lg p-3 text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-xl font-extrabold text-secondary">{alunoCount}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider flex items-center justify-center gap-0.5">
                    Alunos {showAlunos ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </p>
                </button>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-extrabold text-secondary">{equipCount}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider">Equipamentos</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-extrabold text-secondary">{exAvail}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider">Exercícios</p>
                </div>
              </div>

              {showAlunos && alunoList.length > 0 && (
                <div className="mt-3 pt-3 border-t border-outline-variant">
                  <div className="space-y-1">
                    {alunoList.map(a => (
                      <Link key={a.id} href={`/alunos/${a.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {a.usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-sm text-secondary">{a.usuario?.nome ?? '–'}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {showAlunos && alunoList.length === 0 && (
                <p className="text-xs text-outline text-center mt-3 pt-3 border-t border-outline-variant">Nenhum aluno vinculado</p>
              )}

              <button
                onClick={() => setSelected(isSelected ? null : academia)}
                className="mt-4 w-full text-xs font-semibold text-primary hover:text-primary-dark flex items-center justify-center gap-1"
              >
                <Dumbbell size={12} /> {isSelected ? 'Fechar' : 'Gerenciar Equipamentos'}
              </button>
            </div>
          )
        })}
        {academias.length === 0 && (
          <div className="col-span-3 text-center py-16 text-outline">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma academia cadastrada</p>
          </div>
        )}
      </div>

      {/* Equipment / exercise availability map */}
      {selected && (
        <div className="card">
          <h3 className="font-extrabold text-secondary mb-1">Mapa de Disponibilidade da Biblioteca</h3>
          <p className="text-sm text-outline mb-4">Visualize quais exercícios estão liberados para cada unidade baseando o inventário.</p>

          <div className="flex gap-2 mb-4">
            <input
              className="input text-sm"
              placeholder="Adicionar equipamento..."
              value={novoEquip}
              onChange={e => setNovoEquip(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEquipamento(selected.id)}
            />
            <button onClick={() => addEquipamento(selected.id)} className="btn-primary text-sm px-4 py-2">Adicionar</button>
          </div>

          {selected.academia_equipamentos?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.academia_equipamentos.map(eq => (
                <span key={eq.id} className="px-3 py-1 bg-blue-50 text-primary text-xs font-semibold rounded-full">{eq.nome_equipamento}</span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-outline-variant">
                  <th className="label py-2 pr-4">Categoria / Exercício</th>
                  <th className="label py-2 pr-4">Status</th>
                  <th className="label py-2 pr-4">Equipamento Necessário</th>
                  <th className="label py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {exercicios.map(ex => {
                  const ea = selected.exercicio_academias?.find(e => e.exercicio?.id === ex.id)
                  const disponivel = ea?.disponivel ?? false
                  return (
                    <tr key={ex.id} className="border-b border-outline-variant last:border-0 min-h-[64px]">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-secondary">{ex.nome}</p>
                        <p className="text-xs text-outline">{ex.grupo_muscular}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${disponivel ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {disponivel ? '✓ Disponível' : '✕ Indisponível'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-outline">{ea?.exercicio?.nome ?? '–'}</td>
                      <td className="py-4">
                        <button
                          onClick={() => toggleDisponibilidade(selected.id, ex.id, disponivel)}
                          className={`p-1.5 rounded-lg transition-colors ${disponivel ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}
                        >
                          {disponivel ? <X size={14} /> : <Check size={14} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
