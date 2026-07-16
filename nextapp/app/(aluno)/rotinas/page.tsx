import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { CalendarDays, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

export default async function RotinasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  if (!usuario) redirect('/auth/login')

  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) return <div className="p-6 text-center text-outline">Perfil não encontrado.</div>

  const { data: ciclos } = await supabase
    .from('ciclos')
    .select('id, nome, numero, data_inicio, data_fim, status, tema')
    .eq('aluno_id', aluno.id)
    .order('data_inicio', { ascending: false })

  function formatDate(d: string | null) {
    if (!d) return '–'
    return new Date(d + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const statusLabel: Record<string, string> = {
    ativo: 'Em andamento',
    planejado: 'Planejado',
    concluido: 'Concluído',
  }

  const statusColor: Record<string, string> = {
    ativo: 'bg-green-100 text-green-700',
    planejado: 'bg-blue-100 text-blue-700',
    concluido: 'bg-gray-100 text-gray-500',
  }

  return (
    <>
      <Header title="Rotinas de Treino" />
      <div className="p-5 max-w-2xl">
        {(!ciclos || ciclos.length === 0) ? (
          <div className="text-center py-20 text-outline">
            <CalendarDays size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">Nenhuma rotina cadastrada</p>
            <p className="text-sm mt-1">Aguarde seu treinador montar seu programa.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ciclos.map(c => (
              <Link
                key={c.id}
                href={`/rotinas/${c.id}`}
                className="block bg-white rounded-2xl shadow-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.status === 'ativo' ? 'bg-primary' : c.status === 'planejado' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    {c.status === 'concluido'
                      ? <CheckCircle2 size={20} className="text-gray-400" />
                      : <CalendarDays size={20} className={c.status === 'ativo' ? 'text-white' : 'text-primary'} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-secondary">{c.nome}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColor[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </div>
                    {c.tema && <p className="text-xs text-outline mt-0.5">{c.tema}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-outline">
                      <Clock size={11} />
                      <span>{formatDate(c.data_inicio)} → {formatDate(c.data_fim)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-outline flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
