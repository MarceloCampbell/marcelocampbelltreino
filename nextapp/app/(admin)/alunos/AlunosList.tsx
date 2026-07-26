'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, TrendingUp, AlertCircle, Star, UserX, MessageCircle, Calendar } from 'lucide-react'

type AlunoItem = {
  id: string
  plano_contratado: string | null
  data_renovacao: string | null
  nivel: string | null
  objetivo: string | null
  status: string | null
  usuario: { id: string; nome: string; email: string; avatar_url: string | null; telefone: string | null } | null
  academia: { id: string; nome: string } | null
  score: { pontos_total: number; sequencia_atual: number; nivel: number; aderencia_mes: number } | null
  lastNota: { texto: string; criado_em: string } | null
}

function nivelColor(n: string | null) {
  if (n === 'avancado') return 'bg-purple-100 text-purple-700'
  if (n === 'intermediario') return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
}

function nivelLabel(n: string | null) {
  if (n === 'avancado') return 'Avançado'
  if (n === 'intermediario') return 'Intermediário'
  return 'Iniciante'
}

const FILTER_KEY = 'mc_admin_filter_v2'

type StatusFilter = 'ativo' | 'inativo' | 'arquivado'
type Preset = 'todos' | 'em_risco' | 'termina_mes'

export function AlunosList({ alunos }: { alunos: AlunoItem[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativo')
  const [preset, setPreset] = useState<Preset>('todos')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_KEY)
      if (saved) {
        const { sf, p } = JSON.parse(saved)
        if (sf) setStatusFilter(sf)
        if (p) setPreset(p)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ sf: statusFilter, p: preset })) } catch {}
  }, [statusFilter, preset])

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const filtrados = alunos.filter(a => {
    const status = a.status ?? 'ativo'
    if (status !== statusFilter) return false
    const aderencia = a.score?.aderencia_mes ?? 0
    if (preset === 'em_risco' && !(aderencia < 70 && aderencia > 0)) return false
    if (preset === 'termina_mes' && !a.data_renovacao?.startsWith(mesAtual)) return false
    if (search) {
      const q = search.toLowerCase()
      return a.usuario?.nome.toLowerCase().includes(q) || a.usuario?.email.toLowerCase().includes(q)
    }
    return true
  })

  const counts = {
    ativo: alunos.filter(a => (a.status ?? 'ativo') === 'ativo').length,
    inativo: alunos.filter(a => a.status === 'inativo').length,
    arquivado: alunos.filter(a => a.status === 'arquivado').length,
    emRisco: alunos.filter(a => {
      const ad = a.score?.aderencia_mes ?? 0
      return (a.status ?? 'ativo') === 'ativo' && ad < 70 && ad > 0
    }).length,
    terminaMes: alunos.filter(a => (a.status ?? 'ativo') === 'ativo' && !!a.data_renovacao?.startsWith(mesAtual)).length,
  }

  return (
    <div>
      {/* Status tabs */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-white border border-outline-variant rounded-lg overflow-hidden">
          {([
            ['ativo', `Ativos (${counts.ativo})`],
            ['inativo', `Inativos (${counts.inativo})`],
            ['arquivado', `Arquivados (${counts.arquivado})`],
          ] as [StatusFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setStatusFilter(val); setPreset('todos') }}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-r border-outline-variant last:border-0 ${statusFilter === val ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset filter pills — only for ativos */}
      {statusFilter === 'ativo' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {([
            ['todos', 'Todos'],
            ['em_risco', `Em risco (${counts.emRisco})`],
            ['termina_mes', `Termina este mês (${counts.terminaMes})`],
          ] as [Preset, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${preset === p ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-outline-variant hover:border-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Buscar por nome ou e-mail..."
          />
        </div>
        <p className="text-sm text-outline">{filtrados.length} alunos</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map(aluno => {
          const nome = aluno.usuario?.nome ?? 'Sem nome'
          const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
          const aderencia = aluno.score?.aderencia_mes ?? 0
          const sequencia = aluno.score?.sequencia_atual ?? 0
          const isLowAderencia = aderencia < 70 && aderencia > 0
          const isInativo = aluno.status === 'inativo'
          const isArquivado = aluno.status === 'arquivado'
          const terminaEsteMes = !!aluno.data_renovacao?.startsWith(mesAtual)
          const telefone = aluno.usuario?.telefone?.replace(/\D/g, '')

          return (
            <div key={aluno.id} className="relative group">
              <Link href={`/alunos/${aluno.id}`}>
                <div className={`card hover:shadow-card-hover transition-all cursor-pointer ${isInativo || isArquivado ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                        {initials}
                      </div>
                      {(isInativo || isArquivado) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                          <UserX size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-secondary truncate">{nome}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isLowAderencia && !isInativo && !isArquivado && (
                            <AlertCircle size={15} className="text-orange-500" />
                          )}
                          {terminaEsteMes && !isInativo && !isArquivado && (
                            <Calendar size={15} className="text-red-400" title="Termina este mês" />
                          )}
                        </div>
                      </div>
                      {aluno.plano_contratado && (
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">{aluno.plano_contratado}</p>
                      )}
                      {aluno.academia && (
                        <p className="text-xs text-outline mt-0.5">{aluno.academia.nome}</p>
                      )}
                    </div>
                  </div>

                  {aluno.lastNota && (
                    <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-outline line-clamp-2">
                        <span className="font-semibold text-secondary">Nota: </span>{aluno.lastNota.texto}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivelColor(aluno.nivel)}`}>
                      {nivelLabel(aluno.nivel)}
                    </span>
                    {aderencia > 0 && !isInativo && !isArquivado && (
                      <span className="flex items-center gap-1 text-xs text-outline">
                        <TrendingUp size={12} />
                        {aderencia.toFixed(0)}%
                      </span>
                    )}
                    {sequencia > 0 && !isInativo && !isArquivado && (
                      <span className="flex items-center gap-1 text-xs text-orange-500 ml-auto">
                        <Star size={12} />
                        {sequencia} sem.
                      </span>
                    )}
                    {(isInativo || isArquivado) && (
                      <span className="text-xs text-gray-400 ml-auto capitalize">{aluno.status}</span>
                    )}
                  </div>
                </div>
              </Link>

              {/* WhatsApp CTA for at-risk students */}
              {isLowAderencia && !isInativo && !isArquivado && telefone && (
                <a
                  href={`https://wa.me/55${telefone}?text=Oi+${encodeURIComponent(nome.split(' ')[0])}%2C+vi+que+sua+ader%C3%AAncia+caiu+esta+semana.+Tudo+bem%3F`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 p-2 bg-green-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  title="Enviar mensagem no WhatsApp"
                  onClick={e => e.stopPropagation()}
                >
                  <MessageCircle size={14} />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {filtrados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Search size={28} className="text-gray-400" />
          </div>
          <p className="font-bold text-secondary text-lg">Nenhum aluno encontrado</p>
          <p className="text-sm text-outline mt-1 max-w-xs">
            {search
              ? `Não encontramos nenhum aluno com "${search}".`
              : `Não há alunos ${statusFilter === 'inativo' ? 'inativos' : statusFilter === 'arquivado' ? 'arquivados' : preset === 'em_risco' ? 'em risco' : preset === 'termina_mes' ? 'terminando ciclo este mês' : 'ativos'}.`}
          </p>
          {(search || preset !== 'todos') && (
            <button onClick={() => { setSearch(''); setPreset('todos') }} className="mt-4 text-sm font-semibold text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
