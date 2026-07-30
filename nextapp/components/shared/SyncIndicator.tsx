'use client'

import { useSyncStatus } from '@/lib/sync-context'
import { Wifi, WifiOff, Check, Loader2, AlertCircle } from 'lucide-react'

export function SyncIndicator() {
  const { syncState } = useSyncStatus()

  if (syncState === 'idle') return null

  const configs = {
    syncing: {
      bg: 'bg-blue-500',
      icon: <Loader2 size={12} className="animate-spin" />,
      label: 'Sincronizando...',
    },
    saved: {
      bg: 'bg-green-500',
      icon: <Check size={12} />,
      label: 'Salvo ✓',
    },
    offline: {
      bg: 'bg-gray-500',
      icon: <WifiOff size={12} />,
      label: 'Offline',
    },
    error: {
      bg: 'bg-red-500',
      icon: <AlertCircle size={12} />,
      label: 'Erro ao salvar',
    },
  }

  const cfg = configs[syncState]

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-lg transition-all duration-300 ${cfg.bg}`}
      style={{ animation: 'fadeInUp 0.2s ease' }}
    >
      {cfg.icon}
      {cfg.label}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
