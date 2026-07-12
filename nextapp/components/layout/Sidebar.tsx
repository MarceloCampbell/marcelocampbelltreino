'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Dumbbell, Building2, Megaphone,
  Gift, Settings, LogOut, ChevronRight, Menu, X
} from 'lucide-react'
import { Logo } from './Logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Usuario } from '@/types/database'

interface SidebarProps {
  usuario: Usuario
  totalFeed?: number
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

export function Sidebar({ usuario, totalFeed = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = usuario.papel === 'admin' || usuario.papel === 'assistente'
  const links = isAdmin ? adminLinks : alunoLinks
  const [mobileOpen, setMobileOpen] = useState(false)
  const [seenFeed, setSeenFeed] = useState(totalFeed)

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('mc_feed_seen') ?? '0')
    setSeenFeed(stored)
    if (pathname === '/feed') {
      localStorage.setItem('mc_feed_seen', String(totalFeed))
      setSeenFeed(totalFeed)
    }
  }, [pathname, totalFeed])

  const feedBadge = Math.max(0, totalFeed - seenFeed)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-30 p-2 bg-white rounded-lg shadow-sm border border-outline-variant md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} className="text-secondary" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-outline-variant flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-60
      `}>
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <Logo size="md" showText={true} />
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-outline hover:text-secondary p-1"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isFeed = href === '/feed'
            const showBadge = isFeed && feedBadge > 0 && !isAdmin
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {feedBadge > 9 ? '9+' : feedBadge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-outline-variant">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
              className="text-outline hover:text-error transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
