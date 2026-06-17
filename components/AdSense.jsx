'use client'

import { useEffect } from 'react'

export default function AdSense() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  useEffect(() => {
    if (!client) return
    if (typeof window === 'undefined') return
    const id = 'adsense-script'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.async = true
    s.crossOrigin = 'anonymous'
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
    document.head.appendChild(s)
  }, [client])
  return null
}
