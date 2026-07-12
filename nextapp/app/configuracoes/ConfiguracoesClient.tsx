'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Pencil, Check, X } from 'lucide-react'

interface Props {
  usuario: {
    id: string
    nome: string
    email: string
    telefone: string | null
    data_nascimento: string | null
    papel: string
  }
}

export function ConfiguracoesClient({ usuario }: Props) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nome: usuario.nome ?? '',
    telefone: usuario.telefone ?? '',
    data_nascimento: usuario.data_nascimento ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function cancelEdit() {
    setForm({
      nome: usuario.nome ?? '',
      telefone: usuario.telefone ?? '',
      data_nascimento: usuario.data_nascimento ?? '',
    })
    setEditing(false)
    setError('')
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('usuarios')
      .update({
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        data_nascimento: form.data_nascimento || null,
      })
      .eq('id', usuario.id)

    setSaving(false)
    if (err) { setError(err.message); return }

    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const isAdmin = usuario.papel === 'admin' || usuario.papel === 'assistente'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-extrabold text-secondary">Meu Perfil</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
            <Pencil size={14} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-outline hover:text-secondary transition-colors">
              <X size={14} /> Cancelar
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={16} /> Dados atualizados com sucesso!
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="space-y-4">
        {/* E-mail - sempre read only */}
        <div className="flex justify-between border-b border-outline-variant pb-3">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider">E-mail</span>
          <span className="text-sm font-medium text-secondary">{usuario.email}</span>
        </div>

        {/* Nome */}
        <div className={`${editing ? '' : 'flex justify-between border-b border-outline-variant pb-3'}`}>
          {editing ? (
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider">Nome</span>
              <span className="text-sm font-medium text-secondary">{usuario.nome || '–'}</span>
            </>
          )}
        </div>

        {/* Telefone */}
        <div className={`${editing ? '' : 'flex justify-between border-b border-outline-variant pb-3'}`}>
          {editing ? (
            <div>
              <label className="label">Telefone / WhatsApp</label>
              <input className="input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider">Telefone</span>
              <span className="text-sm font-medium text-secondary">{usuario.telefone || '–'}</span>
            </>
          )}
        </div>

        {/* Data de nascimento */}
        <div className={`${editing ? '' : 'flex justify-between border-b border-outline-variant pb-3'}`}>
          {editing ? (
            <div>
              <label className="label">Data de Nascimento</label>
              <input className="input" type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-outline uppercase tracking-wider">Nascimento</span>
              <span className="text-sm font-medium text-secondary">
                {usuario.data_nascimento
                  ? new Date(usuario.data_nascimento + 'T00:00').toLocaleDateString('pt-BR')
                  : '–'}
              </span>
            </>
          )}
        </div>

        {isAdmin && (
          <div className="flex justify-between border-b border-outline-variant pb-3">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">Papel</span>
            <span className="text-sm font-medium text-secondary capitalize">{usuario.papel}</span>
          </div>
        )}
      </div>

      {editing && (
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-6">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      )}
    </div>
  )
}
