'use client'

import { useEffect } from 'react'

export default function PWAInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator) {
      // Register after page load to avoid blocking
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
      if (document.readyState === 'complete') onLoad()
      else window.addEventListener('load', onLoad, { once: true })
    }
  }, [])
  return null
}
