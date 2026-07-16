import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { RotinaDetailClient } from './RotinaDetailClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

function calcSemanaAtual(dataInicio: string | null): number | undefined {
  if (!dataInicio) return undefined
  const inicio = new Date(dataInicio + 'T00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  if (dias < 0) return undefined
  return Math.floor(dias / 7) + 1
}

export default async function RotinaDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase.from('usuarios').select('id').eq('auth_id', user.id).single()
  if (!usuario) redirect('/auth/login')

  const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', usuario.id).single()
  if (!aluno) redirect('/rotinas')

  const { data: ciclo } = await supabase
    .from('ciclos')
    .select('id, nome, numero, data_inicio, data_fim, status, tema')
    .eq('id', params.id)
    .eq('aluno_id', aluno.id)
    .single()

  if (!ciclo) notFound()

  const { data: sessoes } = await supabase
    .from('sessoes_treino')
    .select(`
      *,
      sessao_itens(
        *,
        exercicio:exercicios(
          id, nome, grupo_muscular, video_url, instrucoes, exercicio_substituto_id,
          substituto:exercicios!exercicio_substituto_id(id, nome, grupo_muscular, video_url)
        )
      )
    `)
    .eq('aluno_id', aluno.id)
    .eq('ciclo_id', ciclo.id)
    .neq('tipo', 'aerobico')
    .order('ordem', { ascending: true })

  const semanaAtual = ciclo.status === 'ativo' ? calcSemanaAtual(ciclo.data_inicio) : undefined

  function formatDate(d: string | null) {
    if (!d) return '–'
    return new Date(d + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const statusLabel: Record<string, string> = {
    ativo: 'Em andamento',
    planejado: 'Planejado',
    concluido: 'Concluído',
  }

  return (
    <>
      <Header title={ciclo.nome} />
      <div className="p-5 max-w-2xl">
        <Link href="/rotinas" className="inline-flex items-center gap-1.5 text-sm text-outline hover:text-secondary mb-5">
          <ChevronLeft size={14} />
          Rotinas de Treino
        </Link>

        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">{statusLabel[ciclo.status] ?? ciclo.status}</span>
            {semanaAtual && <span className="text-xs font-bold opacity-90">Semana {semanaAtual}</span>}
          </div>
          <p className="text-xl font-extrabold">{ciclo.nome}</p>
          {ciclo.tema && <p className="text-sm opacity-90 mt-0.5">{ciclo.tema}</p>}
          <p className="text-xs opacity-70 mt-2">{formatDate(ciclo.data_inicio)} → {formatDate(ciclo.data_fim)}</p>
        </div>

        {(!sessoes || sessoes.length === 0) ? (
          <p className="text-center text-outline py-12">Nenhuma sessão cadastrada nesta rotina.</p>
        ) : (
          <RotinaDetailClient
            ciclo={ciclo}
            sessoes={sessoes as any}
            alunoId={aluno.id}
            semanaAtual={semanaAtual}
          />
        )}
      </div>
    </>
  )
}
