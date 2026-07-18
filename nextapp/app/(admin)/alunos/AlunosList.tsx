'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, TrendingUp, AlertCircle, Star, UserX } from 'lucide-react'

type AlunoItem = {
  id: string
  plano_contratado: string | null
  data_renovacao: string | null
  nivel: string | null
  objetivo: string | null
  status: string | null
  usuario: { id: string; nome: string; email: string; avatar_url: string | null } | null
  academia: { id: string; nome: string } | null
  score: { pontos_total: number; sequencia_atual: number; nivel: number; aderencia_mes: number } | null
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

export function AlunosList({ alunos }: { alunos: AlunoItem[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ativo' | 'inativo'>('ativo')

  const filtrados = alunos.filter(a => {
    const matchStatus = (a.status ?? 'ativo') === statusFilter
    const matchSearch =
      a.usuario?.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.usuario?.email.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const countAtivos = alunos.filter(a => (a.status ?? 'ativo') === 'ativo').length
  const countInativos = alunos.filter(a => a.status === 'inativo').length

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-white border border-outline-variant rounded-lg overflow-hidden">
          <button
            onClick={() => setStatusFilter('ativo')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${statusFilter === 'ativo' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
          >
            Ativos ({countAtivos})
          </button>
          <button
            onClick={() => setStatusFilter('inativo')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${statusFilter === 'inativo' ? 'bg-primary text-white' : 'text-secondary hover:bg-gray-50'}`}
          >
            Inativos ({countInativos})
          </button>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map(aluno => {
          const nome = aluno.usuario?.nome ?? 'Sem nome'
          const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
          const aderencia = aluno.score?.aderencia_mes ?? 0
          const sequencia = aluno.score?.sequencia_atual ?? 0
          const isLowAderencia = aderencia < 70 && aderencia > 0
          const isInativo = aluno.status === 'inativo'

          return (
            <Link key={aluno.id} href={`/alunos/${aluno.id}`}>
              <div className={`card hover:shadow-card-hover transition-all cursor-pointer ${isInativo ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                      {initials}
                    </div>
                    {isInativo && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                        <UserX size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-secondary truncate">{nome}</h3>
                      {isLowAderencia && !isInativo && (
                        <AlertCircle size={16} className="text-orange-500 flex-shrink-0" aria-label="Baixa aderência" />
                      )}
                    </div>
                    {aluno.plano_contratado && (
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">{aluno.plano_contratado}</p>
                    )}
                    {aluno.academia && (
                      <p className="text-xs text-outline mt-0.5">{aluno.academia.nome}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-outline-variant">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivelColor(aluno.nivel)}`}>
                    {nivelLabel(aluno.nivel)}
                  </span>
                  {aderencia > 0 && !isInativo && (
                    <span className="flex items-center gap-1 text-xs text-outline">
                      <TrendingUp size={12} />
                      {aderencia.toFixed(0)}% aderência
                    </span>
                  )}
                  {sequencia > 0 && !isInativo && (
                    <span className="flex items-center gap-1 text-xs text-orange-500 ml-auto">
                      <Star size={12} />
                      {sequencia} sem.
                    </span>
                  )}
                  {isInativo && <span className="text-xs text-gray-400 ml-auto">Inativo</span>}
                </div>
              </div>
            </Link>
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
              ? `Não encontramos nenhum aluno com "${search}". Tente outro nome ou e-mail.`
              : `Não há alunos ${statusFilter === 'inativo' ? 'inativos' : 'ativos'} cadastrados.`}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-4 text-sm font-semibold text-primary hover:underline">
              Limpar busca
            </button>
          )}
        </div>
      )}
    </div>
  )
}
