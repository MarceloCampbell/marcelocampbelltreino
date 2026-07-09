'use client'

import { Bell, Settings, Search } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-outline-variant flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-lg font-extrabold text-secondary flex-1">{title}</h1>

      <div className="flex items-center gap-2 flex-1 max-w-xs">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-secondary transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Link href="/configuracoes" className="p-2 rounded-lg hover:bg-gray-100 text-secondary transition-colors">
          <Settings size={20} />
        </Link>
      </div>
    </header>
  )
}
