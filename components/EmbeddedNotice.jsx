'use client'

import { useIsEmbedded } from '@/lib/useIsEmbedded'
import { ExternalLink } from 'lucide-react'

export default function EmbeddedNotice({ className = '' }) {
  const embedded = useIsEmbedded()
  if (!embedded) return null
  return (
    <div className={'rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 ' + className}>
      <div className="flex items-start gap-2">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          You&apos;re viewing this app inside an embedded preview frame. For payments, please{' '}
          <button
            type="button"
            className="font-semibold underline underline-offset-2 hover:opacity-80"
            onClick={() => {
              try { window.open(window.location.href, '_blank', 'noopener,noreferrer') } catch (e) {}
            }}
          >
            open this page in a new tab
          </button>
          {' '}— Razorpay&apos;s mobile field can&apos;t receive focus inside nested iframes.
        </div>
      </div>
    </div>
  )
}
