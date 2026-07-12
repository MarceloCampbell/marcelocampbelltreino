'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Dumbbell, Building2, Megaphone,
  Gift, Settings, LogOut, ChevronDown, ChevronRight
} from 'lucide-react'
import { Logo } from './Logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Usuario } from '@/types/database'

interface SidebarProps {
  usuario: Usuario
}

const adminLinks = [
  { href: '/pendencias', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/alunos', icon: Users, label: 'Alunos' },
  { href: '/biblioteca', icon: Dumbbell, label: 'Biblioteca' },
  { href: '/academias', icon: Building2, label: 'Academias' },
  { href: '/comunicados', icon: Megaphone, label: 'Comunicados' },
  { href: '/aniversarios', icon: Gift, label: 'Aniversários' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

const alunoLinks = [
  { href: '/treino', icon: Dumbbell, label: 'Meu Treino' },
  { href: '/aerobicos', icon: LayoutDashboard, label: 'Aeróbicos' },
  { href: '/feedback', icon: Megaphone, label: 'Feedback Semanal' },
  { href: '/evolucao', icon: Users, label: 'Evolução' },
  { href: '/feed', icon: Gift, label: 'Feed' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = usuario.papel === 'admin' || usuario.papel === 'assistente'
  const links = isAdmin ? adminLinks : alunoLinks

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-outline-variant flex flex-col">
      <div className="p-5 border-b border-outline-variant">
        <Logo size="md" showText={true} />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-outline-variant">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            {usuario.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-secondary truncate">{usuario.nome}</p>
            <p className="text-[10px] text-outline capitalize">
              {usuario.papel === 'admin' ? 'Administrador' : usuario.papel === 'assistente' ? 'Assistente' : 'Aluno'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-outline hover:text-error transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
