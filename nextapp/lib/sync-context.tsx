'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

type SyncState = 'idle' | 'syncing' | 'saved' | 'offline' | 'error'

interface SyncCtx {
  syncState: SyncState
  markSyncing: () => void
  markSaved: () => void
  markError: () => void
}

const SyncContext = createContext<SyncCtx | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const markSyncing = useCallback(() => setSyncState('syncing'), [])

  const markSaved = useCallback(() => {
    setSyncState('saved')
    setTimeout(() => setSyncState('idle'), 2500)
  }, [])

  const markError = useCallback(() => {
    setSyncState('error')
    setTimeout(() => setSyncState('idle'), 3500)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!navigator.onLine) setSyncState('offline')

    const goOffline = () => setSyncState('offline')
    const goOnline = () => setSyncState(prev => prev === 'offline' ? 'idle' : prev)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return (
    <SyncContext.Provider value={{ syncState, markSyncing, markSaved, markError }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncStatus() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncStatus must be used inside SyncProvider')
  return ctx
}
