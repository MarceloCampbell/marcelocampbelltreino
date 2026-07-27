'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, User, Dumbbell, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Result = {
  type: 'aluno' | 'exercicio' | 'academia'
  id: string
  label: string
  sub?: string
  href: string
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const term = q.toLowerCase()
      const [alunosRes, exsRes, acadsRes] = await Promise.all([
        supabase.from('alunos').select('id, usuario:usuarios(nome, email)').ilike('usuarios.nome', `%${term}%`).limit(5),
        supabase.from('exercicios').select('id, nome, grupo_muscular').ilike('nome', `%${term}%`).limit(5),
        supabase.from('academias').select('id, nome').ilike('nome', `%${term}%`).limit(3),
      ])
      const r: Result[] = []
      ;(alunosRes.data ?? []).forEach(a => {
        const u = a.usuario as any
        if (u?.nome) r.push({ type: 'aluno', id: a.id, label: u.nome, sub: u.email, href: `/alunos/${a.id}` })
      })
      ;(exsRes.data ?? []).forEach(e => {
        r.push({ type: 'exercicio', id: e.id, label: e.nome, sub: e.grupo_muscular, href: `/biblioteca` })
      })
      ;(acadsRes.data ?? []).forEach(a => {
        r.push({ type: 'academia', id: a.id, label: a.nome, href: `/academias` })
      })
      setResults(r)
      setLoading(false)
    }, 300)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  function go(href: string) {
    router.push(href)
    onClose()
  }

  const icons = { aluno: User, exercicio: Dumbbell, academia: Building2 }
  const labels = { aluno: 'Aluno', exercicio: 'Exercício', academia: 'Academia' }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <Search size={18} className="text-outline flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar alunos, exercícios, academias..."
            className="flex-1 text-secondary placeholder:text-outline outline-none text-base"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-outline transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="px-4 py-6 text-center text-sm text-outline">Buscando...</div>
        )}

        {!loading && q.length >= 2 && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-outline">Nenhum resultado para &ldquo;{q}&rdquo;</div>
        )}

        {results.length > 0 && (
          <div className="py-1">
            {results.map(r => {
              const Icon = icons[r.type]
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => go(r.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'aluno' ? 'bg-primary/10 text-primary' : r.type === 'exercicio' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-secondary text-sm truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-outline truncate">{r.sub}</p>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${r.type === 'aluno' ? 'bg-primary/10 text-primary' : r.type === 'exercicio' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                    {labels[r.type]}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {q.length < 2 && (
          <div className="px-4 py-5 text-center text-sm text-outline">
            Digite pelo menos 2 caracteres para buscar
          </div>
        )}
      </div>
    </div>
  )
}
