'use client'

import { useState } from 'react'
import { Plus, Megaphone, Loader2, Trash2, Clock, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Comunicado = {
  id: string
  titulo: string
  conteudo: string
  tipo: 'aviso' | 'urgente' | 'novidade'
  destinatarios: string
  enviado_por: string
  enviado_em: string
  autor: { nome: string } | null
  agendado_para: string | null
  imagem_url: string | null
  video_url: string | null
}

const tipoConfig = {
  aviso: { label: 'Aviso', class: 'badge-baixa' },
  urgente: { label: 'Urgente', class: 'badge-urgente' },
  novidade: { label: 'Novidade', class: 'bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full' },
}

const destinatariosLabel: Record<string, string> = {
  todos: 'Todos os alunos',
  premium: 'Alunos Premium',
  basico: 'Alunos Básico',
}

function getYoutubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  return m ? m[1] : null
}

export function ComunicadosClient({ comunicados: initial }: { comunicados: Comunicado[] }) {
  const supabase = createClient()
  const [comunicados, setComunicados] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [agendarMode, setAgendarMode] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'aviso' as 'aviso' | 'urgente' | 'novidade',
    destinatarios: 'todos',
    agendado_para: '',
    imagem_url: '',
    video_url: '',
  })

  async function send() {
    if (!form.conteudo.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user!.id)
      .single()

    const payload: Record<string, unknown> = {
      titulo: form.titulo,
      conteudo: form.conteudo,
      tipo: form.tipo,
      destinatarios: form.destinatarios,
      enviado_por: usuario!.id,
      imagem_url: form.imagem_url.trim() || null,
      video_url: form.video_url.trim() || null,
      agendado_para: agendarMode && form.agendado_para ? form.agendado_para : null,
    }

    const { data } = await supabase
      .from('comunicados')
      .insert(payload)
      .select('*, autor:usuarios(nome)')
      .single()

    if (data) {
      setComunicados(prev => [data, ...prev])
      setForm({ titulo: '', conteudo: '', tipo: 'aviso', destinatarios: 'todos', agendado_para: '', imagem_url: '', video_url: '' })
      setAgendarMode(false)
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deleteComunicado(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('comunicados').delete().eq('id', id)
    if (!error) {
      setComunicados(prev => prev.filter(c => c.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-outline">
          {comunicados.length} comunicado{comunicados.length !== 1 ? 's' : ''} publicado{comunicados.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 py-2">
          <Plus size={16} /> Novo Comunicado
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-primary">
          <h3 className="font-extrabold text-secondary mb-4">Novo Comunicado</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                placeholder="Título do comunicado"
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Mensagem *</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="Escreva o comunicado..."
                value={form.conteudo}
                onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value as 'aviso' | 'urgente' | 'novidade' }))}
                >
                  <option value="aviso">Aviso</option>
                  <option value="urgente">Urgente</option>
                  <option value="novidade">Novidade</option>
                </select>
              </div>
              <div>
                <label className="label">Destinatários</label>
                <select
                  className="input"
                  value={form.destinatarios}
                  onChange={e => setForm(p => ({ ...p, destinatarios: e.target.value }))}
                >
                  <option value="todos">Todos os alunos</option>
                  <option value="premium">Alunos Premium</option>
                  <option value="basico">Alunos Básico</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">URL da Imagem (opcional)</label>
              <input
                className="input"
                placeholder="https://exemplo.com/imagem.jpg"
                value={form.imagem_url}
                onChange={e => setForm(p => ({ ...p, imagem_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">URL do Vídeo (opcional)</label>
              <input
                className="input"
                placeholder="https://youtube.com/watch?v=... ou outro link"
                value={form.video_url}
                onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Publicação</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAgendarMode(false)}
                  className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${!agendarMode ? 'bg-primary text-white border-primary' : 'btn-ghost border-outline'}`}
                >
                  Publicar agora
                </button>
                <button
                  type="button"
                  onClick={() => setAgendarMode(true)}
                  className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${agendarMode ? 'bg-primary text-white border-primary' : 'btn-ghost border-outline'}`}
                >
                  Agendar envio
                </button>
              </div>
              {agendarMode && (
                <input
                  type="datetime-local"
                  className="input mt-2"
                  value={form.agendado_para}
                  onChange={e => setForm(p => ({ ...p, agendado_para: e.target.value }))}
                />
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={send}
              disabled={saving || !form.conteudo.trim()}
              className="btn-primary text-sm px-6"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Enviando...' : agendarMode ? 'Agendar' : 'Publicar'}
            </button>
            <button onClick={() => { setShowForm(false); setAgendarMode(false) }} className="btn-ghost text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comunicados.map(c => {
          const config = tipoConfig[c.tipo]
          const ytId = c.video_url ? getYoutubeId(c.video_url) : null
          const destLabel = destinatariosLabel[c.destinatarios] ?? c.destinatarios

          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-primary flex-shrink-0" />
                  <h3 className="font-bold text-secondary">{c.titulo || 'Comunicado'}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.agendado_para && (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <Clock size={11} />
                      Agendado
                    </span>
                  )}
                  <span className={config.class}>{config.label}</span>
                  <button
                    onClick={() => deleteComunicado(c.id)}
                    disabled={deletingId === c.id}
                    className="btn-ghost p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Excluir comunicado"
                  >
                    {deletingId === c.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>

              <p className="text-sm text-secondary leading-relaxed">{c.conteudo}</p>

              {c.imagem_url && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <img
                    src={c.imagem_url}
                    alt="Imagem do comunicado"
                    className="w-full max-h-72 object-cover"
                  />
                </div>
              )}

              {c.video_url && (
                <div className="mt-3">
                  {ytId ? (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${ytId}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Vídeo do comunicado"
                      />
                    </div>
                  ) : (
                    <a
                      href={c.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                    >
                      <ExternalLink size={14} />
                      Ver vídeo
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 mt-3 text-xs text-outline">
                <span>{c.autor?.nome}</span>
                <span>·</span>
                <span>
                  {c.agendado_para
                    ? `Agendado para ${new Date(c.agendado_para).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : new Date(c.enviado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  }
                </span>
                <span>·</span>
                <span>Para: {destLabel}</span>
              </div>
            </div>
          )
        })}
        {comunicados.length === 0 && (
          <div className="text-center py-16 text-outline">
            <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhum comunicado publicado</p>
          </div>
        )}
      </div>
    </div>
  )
}
