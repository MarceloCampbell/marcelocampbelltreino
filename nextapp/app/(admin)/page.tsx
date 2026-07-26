import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { AlertCircle, Calendar, UserCheck, ClipboardList } from 'lucide-react'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekLaterStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]

  const [alunosResult, scoresResult, pendsResult] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, data_renovacao, status, usuario:usuarios(nome, telefone)')
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false }),
    supabase
      .from('scores')
      .select('aluno_id, aderencia_mes, sequencia_atual'),
    supabase
      .from('pendencias')
      .select('id, aluno_id, titulo, status')
      .eq('status', 'aberta'),
  ])

  const alunos = alunosResult.data ?? []
  const scores = scoresResult.data ?? []
  const pendencias = pendsResult.data ?? []

  const scoreMap: Record<string, { aderencia_mes: number; sequencia_atual: number }> = {}
  scores.forEach(s => { scoreMap[s.aluno_id] = s })

  const terminandoCiclo = alunos.filter(a =>
    a.data_renovacao && a.data_renovacao >= todayStr && a.data_renovacao <= weekLaterStr
  )
  const emRisco = alunos.filter(a => {
    const ad = scoreMap[a.id]?.aderencia_mes ?? 0
    return ad < 70 && ad > 0
  })
  const semSequencia = alunos.filter(a => (scoreMap[a.id]?.sequencia_atual ?? 0) === 0)

  return (
    <>
      <Header title="Painel Admin" showGlobalSearch />
      <div className="p-6 space-y-6">

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Alunos Ativos', value: alunos.length, color: 'text-primary', icon: UserCheck },
            { label: 'Terminando Ciclo', value: terminandoCiclo.length, color: 'text-red-500', icon: Calendar },
            { label: 'Em Risco', value: emRisco.length, color: 'text-orange-500', icon: AlertCircle },
            { label: 'Pendências Abertas', value: pendencias.length, color: 'text-purple-500', icon: ClipboardList },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card text-center">
              <Icon size={22} className={`mx-auto mb-2 ${color}`} />
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-outline mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Terminando ciclo esta semana */}
        {terminandoCiclo.length > 0 && (
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-red-400" />
              Terminando ciclo esta semana ({terminandoCiclo.length})
            </h3>
            <div className="space-y-2">
              {terminandoCiclo.map(a => {
                const nome = (a.usuario as any)?.nome ?? 'Aluno'
                const diasRestantes = Math.ceil((new Date(a.data_renovacao!).getTime() - today.getTime()) / 86400000)
                return (
                  <Link key={a.id} href={`/alunos/${a.id}`} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                    <span className="font-semibold text-secondary text-sm">{nome}</span>
                    <span className="text-xs font-bold text-red-600">
                      {diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : `Em ${diasRestantes} dias`}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Em risco */}
        {emRisco.length > 0 && (
          <div className="card">
            <h3 className="font-extrabold text-secondary mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-orange-500" />
              Alunos em risco ({emRisco.length})
            </h3>
            <div className="space-y-2">
              {emRisco.map(a => {
                const nome = (a.usuario as any)?.nome ?? 'Aluno'
                const telefone = (a.usuario as any)?.telefone?.replace(/\D/g, '')
                const aderencia = scoreMap[a.id]?.aderencia_mes ?? 0
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-orange-50">
                    <Link href={`/alunos/${a.id}`} className="flex-1 font-semibold text-secondary text-sm hover:underline">
                      {nome}
                    </Link>
                    <span className="text-xs text-orange-600 font-bold">{aderencia.toFixed(0)}% aderência</span>
                    {telefone && (
                      <a
                        href={`https://wa.me/55${telefone}?text=Oi+${encodeURIComponent(nome.split(' ')[0])}%2C+vi+que+sua+ader%C3%AAncia+caiu.+Tudo+bem%3F`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex-shrink-0"
                        title="Enviar WhatsApp"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ver todos os alunos', href: '/alunos', color: 'btn-primary' },
            { label: 'Pendências', href: '/pendencias', color: 'btn-secondary' },
            { label: 'Comunicados', href: '/comunicados', color: 'btn-secondary' },
            { label: 'Biblioteca', href: '/biblioteca', color: 'btn-secondary' },
          ].map(({ label, href, color }) => (
            <Link key={href} href={href} className={`${color} text-sm justify-center`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
