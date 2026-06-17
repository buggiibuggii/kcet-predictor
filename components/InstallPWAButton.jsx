'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    function onPrompt(e) { e.preventDefault(); setDeferred(e) }
    function onInstalled() { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  if (installed || !deferred) return null
  return (
    <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
      deferred.prompt(); const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setDeferred(null)
    }}>
      <Download className="h-4 w-4" /> Install App
    </Button>
  )
}
