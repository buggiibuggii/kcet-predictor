'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the app is being rendered inside an iframe (e.g. the
 * Emergent Preview embedded view). Some third-party payment modals like
 * Razorpay Checkout cannot reliably capture input focus when nested inside
 * such an iframe due to the parent frame's permissions policy.
 */
export function useIsEmbedded() {
  const [embedded, setEmbedded] = useState(false)
  useEffect(() => {
    try {
      setEmbedded(window.top !== window.self)
    } catch (e) {
      // Cross-origin access throws — that itself means we ARE embedded.
      setEmbedded(true)
    }
  }, [])
  return embedded
}
