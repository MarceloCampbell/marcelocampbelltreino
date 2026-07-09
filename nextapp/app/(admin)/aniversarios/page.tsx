import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Gift, CalendarHeart } from 'lucide-react'

function getNextBirthday(dob: string): { daysUntil: number; date: Date } {
  const today = new Date()
  const birth = new Date(dob + 'T00:00')
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { daysUntil: diff, date: next }
}

export default async function AniversariosPage() {
  const supabase = await createClient()

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, data_nascimento, papel')
    .eq('ativo', true)
    .eq('papel', 'aluno')
    .not('data_nascimento', 'is', null)

  const comAniversario = (usuarios ?? [] as { id: string; nome: string; data_nascimento: string | null; papel: string }[])
    .map(u => ({ ...u, ...getNextBirthday(u.data_nascimento!) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const hoje = comAniversario.filter(u => u.daysUntil === 0)
  const proximaSemana = comAniversario.filter(u => u.daysUntil > 0 && u.daysUntil <= 7)
  const proximoMes = comAniversario.filter(u => u.daysUntil > 7 && u.daysUntil <= 30)

  function AlunoRow({ u }: { u: typeof comAniversario[0] }) {
    const initials = u.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-card">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold">
          {initials}
        </div>
        <div className="flex-1">
          <p className="font-bold text-secondary">{u.nome}</p>
          <p className="text-xs text-outline">{u.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
        </div>
        {u.daysUntil === 0 && (
          <span className="badge-urgente flex items-center gap-1"><Gift size={12} /> Hoje!</span>
        )}
        {u.daysUntil > 0 && u.daysUntil <= 7 && (
          <span className="badge-media">{u.daysUntil} dias</span>
        )}
        {u.daysUntil > 7 && (
          <span className="badge-baixa">{u.daysUntil} dias</span>
        )}
      </div>
    )
  }

  return (
    <>
      <Header title="Aniversários" />
      <div className="p-6 space-y-6">
        {hoje.length > 0 && (
          <div>
            <h2 className="font-extrabold text-secondary flex items-center gap-2 mb-3">
              <Gift size={20} className="text-primary" /> Aniversariantes Hoje 🎉
            </h2>
            <div className="space-y-3">
              {hoje.map(u => <AlunoRow key={u.id} u={u} />)}
            </div>
          </div>
        )}

        {proximaSemana.length > 0 && (
          <div>
            <h2 className="font-extrabold text-secondary flex items-center gap-2 mb-3">
              <CalendarHeart size={18} className="text-orange-500" /> Próximos 7 dias
            </h2>
            <div className="space-y-3">
              {proximaSemana.map(u => <AlunoRow key={u.id} u={u} />)}
            </div>
          </div>
        )}

        {proximoMes.length > 0 && (
          <div>
            <h2 className="font-extrabold text-secondary flex items-center gap-2 mb-3">
              <CalendarHeart size={18} className="text-blue-400" /> Próximos 30 dias
            </h2>
            <div className="space-y-3">
              {proximoMes.map(u => <AlunoRow key={u.id} u={u} />)}
            </div>
          </div>
        )}

        {comAniversario.length === 0 && (
          <div className="text-center py-16 text-outline">
            <Gift size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhum aniversário registrado</p>
            <p className="text-sm mt-1">Cadastre a data de nascimento dos alunos para ver aqui</p>
          </div>
        )}
      </div>
    </>
  )
}
