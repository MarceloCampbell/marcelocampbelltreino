'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function PwaVersionCheck() {
  const [updateReady, setUpdateReady] = useState(false)
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return
      setReg(registration)

      // Already has a waiting worker when page loads (user had old tab open)
      if (registration.waiting) {
        setUpdateReady(true)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true)
          }
        })
      })
    })

    // If SW controller changes (skipWaiting completed), reload
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  function applyUpdate() {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setUpdateReady(false)
  }

  if (!updateReady) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[200] flex items-center justify-between gap-3 bg-primary text-white px-4 py-3 text-sm font-medium shadow-lg">
      <span>Nova versão disponível</span>
      <button
        onClick={applyUpdate}
        className="flex items-center gap-1.5 bg-white text-primary px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-colors"
      >
        <RefreshCw size={13} />
        Atualizar
      </button>
    </div>
  )
}
