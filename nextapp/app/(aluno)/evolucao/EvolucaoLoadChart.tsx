'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'

type ExercicioData = {
  nome: string
  sessoes: { date: string; carga: number }[]
}

export function EvolucaoLoadChart({ alunoId }: { alunoId: string }) {
  const supabase = createClient()
  const [data, setData] = useState<ExercicioData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, concluido_em')
        .eq('aluno_id', alunoId)
        .not('concluido_em', 'is', null)
        .order('concluido_em', { ascending: true })

      if (!sessions?.length) { setLoading(false); return }
      const sessionIds = sessions.map(s => s.id)

      const { data: execs } = await supabase
        .from('set_executions')
        .select('session_id, sessao_item_id, carga_registrada')
        .in('session_id', sessionIds)
        .eq('concluida', true)
        .not('carga_registrada', 'is', null)

      if (!execs?.length) { setLoading(false); return }
      const itemIds = [...new Set(execs.map(e => e.sessao_item_id))]

      const { data: itens } = await supabase
        .from('sessao_itens')
        .select('id, exercicio_id')
        .in('id', itemIds)

      if (!itens?.length) { setLoading(false); return }
      const exIds = [...new Set(itens.map(i => i.exercicio_id).filter(Boolean))]

      const { data: exercicios } = await supabase
        .from('exercicios')
        .select('id, nome')
        .in('id', exIds)

      if (!exercicios?.length) { setLoading(false); return }

      const sessionMap: Record<string, string> = {}
      sessions.forEach(s => { sessionMap[s.id] = s.concluido_em! })

      const itemExMap: Record<string, string> = {}
      itens.forEach(item => {
        const ex = exercicios.find(e => e.id === item.exercicio_id)
        if (ex) itemExMap[item.id] = ex.nome
      })

      const byEx: Record<string, { date: string; carga: number }[]> = {}
      for (const exec of execs) {
        const nome = itemExMap[exec.sessao_item_id]
        const date = sessionMap[exec.session_id]
        if (!nome || !date) continue
        if (!byEx[nome]) byEx[nome] = []
        const existing = byEx[nome].find(d => d.date === date)
        if (existing) {
          existing.carga = Math.max(existing.carga, exec.carga_registrada as number)
        } else {
          byEx[nome].push({ date, carga: exec.carga_registrada as number })
        }
      }

      for (const nome of Object.keys(byEx)) {
        byEx[nome].sort((a, b) => a.date.localeCompare(b.date))
      }

      const sorted = Object.entries(byEx)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 4)
        .map(([nome, sessoes]) => ({ nome, sessoes }))

      setData(sorted)
      setLoading(false)
    }
    load()
  }, [alunoId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="flex items-end gap-2 h-24">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${30 + Math.random() * 60}px` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="card text-center py-8">
        <TrendingUp size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="font-semibold text-secondary">Sem dados de carga ainda</p>
        <p className="text-sm text-outline mt-1">Complete treinos para ver sua evolução aqui.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-extrabold text-secondary mb-5">Evolução de Carga</h3>
      <div className="space-y-6">
        {data.map(({ nome, sessoes }) => {
          const maxCarga = Math.max(...sessoes.map(s => s.carga), 1)
          const recent = sessoes.slice(-10)
          return (
            <div key={nome}>
              <p className="text-xs font-bold text-outline uppercase tracking-wide mb-2 truncate">{nome}</p>
              <div className="flex items-end gap-1 h-24">
                {recent.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <span className="text-[9px] text-outline tabular-nums">{s.carga}</span>
                    <div
                      className={`w-full rounded-t-sm transition-all ${i === recent.length - 1 ? 'bg-primary' : 'bg-primary/40'}`}
                      style={{ height: `${Math.max((s.carga / maxCarga) * 64, 4)}px` }}
                    />
                    <span className="text-[8px] text-outline tabular-nums">
                      {new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
