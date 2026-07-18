'use client'

import { useState } from 'react'
import { Bell, Settings, Search, X } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
  showSearch?: boolean
}

export function Header({ title, actions, showSearch = false }: HeaderProps) {
  const [showNotif, setShowNotif] = useState(false)

  return (
    <>
      <header className="h-16 bg-white border-b border-outline-variant flex items-center px-6 gap-4 sticky top-0 z-10">
        <h1 className="text-lg font-extrabold text-secondary flex-1 truncate min-w-0">{title}</h1>

        {showSearch && (
          <div className="flex items-center gap-2 flex-shrink-0 max-w-xs">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative p-2 rounded-lg hover:bg-gray-100 text-secondary transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <Link href="/configuracoes" className="p-2 rounded-lg hover:bg-gray-100 text-secondary transition-colors">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {showNotif && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)}>
          <div
            className="absolute top-16 right-4 w-80 bg-white rounded-2xl shadow-xl border border-outline-variant"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="font-extrabold text-secondary">Notificações</h3>
              <button
                onClick={() => setShowNotif(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-outline transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Bell size={40} className="text-outline opacity-30 mb-3" />
              <p className="font-semibold text-secondary">Nenhuma notificação</p>
              <p className="text-sm text-outline mt-1">Você não tem notificações no momento.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
