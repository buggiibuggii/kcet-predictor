import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'KCET College Predictor 2026 — Find Your Best Engineering College',
  description:
    'Free KCET 2026 college predictor based on previous year cutoffs. Enter your KCET rank, category, course and round to discover engineering colleges in Karnataka you can get into. Tier-wise sorted results.',
  keywords: [
    'KCET 2026', 'KCET college predictor', 'KCET cutoff', 'Karnataka engineering admission',
    'KCET rank predictor', 'KEA cutoff', 'Engineering colleges Bengaluru', 'CET counselling',
  ],
  openGraph: {
    title: 'KCET College Predictor 2026',
    description: 'Predict your KCET 2026 colleges instantly. Tier-wise sorted, all rounds.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
