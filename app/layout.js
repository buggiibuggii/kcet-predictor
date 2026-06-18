import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import PWAInit from '@/components/PWAInit'
import AdSense from '@/components/AdSense'
import GoogleAnalytics from '@/components/GoogleAnalytics'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kcetpredictor.in'

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'KCET College Predictor 2026 — Find Your Best Engineering College',
    template: '%s — KCET Predictor 2026',
  },
  description:
    'Free KCET 2026 college predictor based on previous year cutoffs. Enter your KCET rank, category, course and round to discover engineering colleges in Karnataka you can get into. Tier-wise sorted, premium 6-page PDF report available.',
  keywords: [
    'KCET 2026', 'KCET college predictor', 'KCET cutoff', 'Karnataka engineering admission',
    'KCET rank predictor', 'KEA cutoff', 'Engineering colleges Bengaluru', 'CET counselling',
    'KCET option entry', 'KCET 2026 cutoff', 'KEA option entry order',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: baseUrl,
    title: 'KCET College Predictor 2026',
    description: 'Predict your KCET 2026 colleges instantly. Tier-wise sorted, all rounds.',
    siteName: 'KCET Predictor 2026',
  },
  twitter: { card: 'summary_large_image', title: 'KCET College Predictor 2026', description: 'Predict your KCET 2026 colleges instantly.' },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'KCET College Predictor 2026',
  url: baseUrl,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description: 'Free KCET 2026 college predictor with previous-year cutoffs and premium 6-page PDF reports.',
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KCET Predictor',
  url: baseUrl,
  logo: `${baseUrl}/icon.svg`,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="application-name" content="KCET Predictor 2026" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KCET Predictor" />
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
        <PWAInit />
        <AdSense />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
