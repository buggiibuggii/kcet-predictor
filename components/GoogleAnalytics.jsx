'use client'

import { Suspense, useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_ID) return
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
    const qs = searchParams?.toString()
    const page_path = qs ? `${pathname}?${qs}` : pathname
    window.gtag('config', GA_ID, { page_path })
  }, [pathname, searchParams])

  return null
}

export default function GoogleAnalytics() {
  // Load only in production AND only when the measurement ID is provided.
  if (process.env.NODE_ENV !== 'production' || !GA_ID) return null

  return (
    <>
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
// Disable automatic page_view; we send manually on route change so SPA navigations are captured.
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  )
}
