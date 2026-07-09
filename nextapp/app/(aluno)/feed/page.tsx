import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Megaphone } from 'lucide-react'

const tipoConfig: Record<string, { label: string; color: string; icon: string }> = {
  aviso: { label: 'Aviso', color: 'bg-blue-50 border-blue-200', icon: '📢' },
  urgente: { label: 'Urgente', color: 'bg-red-50 border-red-200', icon: '🚨' },
  novidade: { label: 'Novidade', color: 'bg-purple-50 border-purple-200', icon: '✨' },
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*, autor:usuarios(nome)')
    .order('enviado_em', { ascending: false })
    .limit(20)

  return (
    <>
      <Header title="Feed da Consultoria" />
      <div className="p-6">
        <p className="text-sm text-outline mb-6">Fique por dentro das novidades e comunicados do seu treinador.</p>
        <div className="space-y-4">
          {(comunicados ?? []).map(c => {
            const config = tipoConfig[c.tipo] ?? tipoConfig.aviso
            return (
              <div key={c.id} className={`border rounded-xl p-5 ${config.color}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">{config.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-secondary">{c.titulo || 'Comunicado'}</h3>
                      <span className="text-xs text-outline whitespace-nowrap">
                        {new Date(c.enviado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">{c.conteudo}</p>
                    <p className="text-xs text-outline mt-2">{c.autor?.nome}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {(!comunicados || comunicados.length === 0) && (
            <div className="text-center py-16 text-outline">
              <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Nenhum comunicado ainda</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
