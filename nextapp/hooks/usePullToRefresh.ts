'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function usePullToRefresh(threshold = 72) {
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const router = useRouter()

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
        pulling.current = true
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > threshold && window.scrollY === 0) {
        pulling.current = false
        setRefreshing(true)
        router.refresh()
        setTimeout(() => setRefreshing(false), 1200)
      }
    }

    function onTouchEnd() {
      pulling.current = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [router, threshold])

  return { refreshing }
}
