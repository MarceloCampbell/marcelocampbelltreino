'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function PushNotifToggle({ alunoId }: { alunoId: string }) {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setStatus(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) {
      alert('Notificações push não configuradas neste servidor.')
      return
    }
    setSaving(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), alunoId }),
      })
      setStatus('subscribed')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function unsubscribe() {
    setSaving(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, alunoId }),
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') return <div className="h-10 w-40 bg-gray-100 animate-pulse rounded-xl" />
  if (status === 'unsupported') return null
  if (status === 'denied') return (
    <p className="text-xs text-outline">Notificações bloqueadas no navegador. Permita nas configurações do site para ativar.</p>
  )

  return (
    <button
      onClick={status === 'subscribed' ? unsubscribe : subscribe}
      disabled={saving}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        status === 'subscribed'
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-gray-100 text-secondary hover:bg-gray-200'
      }`}
    >
      {saving ? <Loader2 size={16} className="animate-spin" /> : status === 'subscribed' ? <Bell size={16} /> : <BellOff size={16} />}
      {status === 'subscribed' ? 'Notificações ativas' : 'Ativar notificações'}
    </button>
  )
}
