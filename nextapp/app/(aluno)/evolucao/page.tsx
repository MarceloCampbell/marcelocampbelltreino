import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { TrendingUp, Star, Award, Target } from 'lucide-react'

export default async function EvolucaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  const { data: aluno } = await supabase.from('alunos').select('id, objetivo').eq('usuario_id', usuario!.id).single()
  if (!aluno) return <div className="p-6 text-center">Perfil não encontrado.</div>

  const [scoreResult, badgesResult, scoresSemanaisResult] = await Promise.all([
    supabase.from('scores').select('*').eq('aluno_id', aluno.id).single(),
    supabase.from('aluno_badges').select('*, badge:badges(*)').eq('aluno_id', aluno.id).order('conquistado_em', { ascending: false }),
    supabase.from('scores_semanais').select('*').eq('aluno_id', aluno.id).order('semana_referencia', { ascending: false }).limit(12),
  ])

  const score = scoreResult.data
  const badges = badgesResult.data ?? []
  const semanais = scoresSemanaisResult.data ?? []
  const aderencia = score?.aderencia_mes ?? 0

  return (
    <>
      <Header title="Minha Evolução" />
      <div className="p-6 space-y-6">
        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Star, label: 'Pontos Totais', value: score?.pontos_total ?? 0, color: 'text-yellow-500' },
            { icon: TrendingUp, label: 'Sequência Atual', value: `${score?.sequencia_atual ?? 0} sem.`, color: 'text-green-500' },
            { icon: Target, label: 'Aderência Mês', value: `${aderencia.toFixed(0)}%`, color: 'text-primary' },
            { icon: Award, label: 'Nível', value: `${score?.nivel ?? 1}`, color: 'text-purple-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card text-center">
              <Icon size={24} className={`mx-auto mb-2 ${color}`} />
              <p className="text-2xl font-extrabold text-secondary">{value}</p>
              <p className="text-xs text-outline mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Aderência visual */}
        <div className="card">
          <h3 className="font-extrabold text-secondary mb-4">Aderência ao Treino</h3>
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e1e2e9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#1E6FD9" strokeWidth="3"
                  strokeDasharray={`${aderencia} ${100 - aderencia}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-primary-dark">{aderencia.toFixed(0)}%</span>
                <span className="text-[10px] text-outline">este mês</span>
              </div>
            </div>
            <div className="flex-1">
              {aluno.objetivo && (
                <p className="text-sm text-secondary mb-3"><span className="font-bold">Objetivo:</span> {aluno.objetivo}</p>
              )}
              <p className="text-sm text-outline">
                {aderencia >= 80 ? '🔥 Excelente consistência! Continue assim.' :
                 aderencia >= 60 ? '💪 Boa frequência. Podemos melhorar!' :
                 '⚡ Ainda dá para melhorar a consistência esta semana.'}
              </p>
            </div>
          </div>
        </div>

        {/* Score semanal chart */}
        {semanais.length > 0 && (
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Score das Últimas Semanas</h3>
            <div className="flex items-end gap-2 h-32">
              {semanais.slice(0, 8).reverse().map((s, i) => {
                const maxScore = Math.max(...semanais.map(s => s.score_total), 1)
                const pct = (s.score_total / maxScore) * 100
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] text-outline">{s.score_total}</span>
                    <div
                      className={`w-full rounded-t-sm ${i === semanais.slice(0, 8).length - 1 ? 'bg-primary-dark' : 'bg-primary opacity-60'}`}
                      style={{ height: `${Math.max(pct * 0.8, 4)}px` }}
                    />
                    <span className="text-[9px] text-outline">{new Date(s.semana_referencia + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4">Minhas Conquistas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((ab: any) => (
                <div key={ab.badge.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <span className="text-2xl">{ab.badge.icone}</span>
                  <div>
                    <p className="text-xs font-bold text-yellow-800">{ab.badge.nome}</p>
                    <p className="text-[10px] text-yellow-600">{ab.badge.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {badges.length === 0 && (
          <div className="card text-center py-8">
            <Award size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-secondary">Nenhuma conquista ainda</p>
            <p className="text-sm text-outline mt-1">Continue treinando para desbloquear seus primeiros badges!</p>
          </div>
        )}
      </div>
    </>
  )
}
