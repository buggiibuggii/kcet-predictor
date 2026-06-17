'use client'

import { useEffect, useRef } from 'react'

export default function AdSlot({ label = 'Advertisement', className = '', slot = '', format = 'auto', responsive = true }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const insRef = useRef(null)
  useEffect(() => {
    if (!client || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {}
  }, [client, slot])

  if (client && slot) {
    return (
      <ins
        ref={insRef}
        className={'adsbygoogle block ' + className}
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    )
  }

  return (
    <div
      className={
        'flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground ' +
        className
      }
    >
      {label}
    </div>
  )
}
