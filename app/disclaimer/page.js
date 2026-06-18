import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

const LAST_UPDATED = 'June 2026'

export const metadata = {
  title: 'Disclaimer',
  description:
    'Disclaimer for KCET College Predictor 2026. We are not affiliated with KEA, Karnataka Government, VTU, or any college. Predictions are informational estimates only.',
  alternates: { canonical: '/disclaimer' },
  openGraph: { title: 'Disclaimer — KCET Predictor 2026', type: 'article' },
}

const SECTIONS = [
  {
    title: '1. Not affiliated with KEA or any institution',
    body: (
      <p>This website (<b>KCET Predictor 2026</b>) is an <b>independent</b>, privately-operated service. We are <b>not</b> affiliated with, endorsed by, sponsored by, or in any way officially connected to:</p>
    ),
    list: [
      'The Karnataka Examinations Authority (KEA)',
      'The Government of Karnataka or any of its departments',
      'Visvesvaraya Technological University (VTU)',
      'Any individual college, university, or institute mentioned on the site',
    ],
  },
  {
    title: '2. Informational & educational use only',
    body: (
      <p>All content on this site &mdash; including the predictor, the Premium PDF report, the suggested option-entry order, and every cutoff number displayed &mdash; is provided <b>for informational and educational purposes only</b>. It is intended to assist students and parents during the KCET counselling preparation phase. It is <b>not</b> professional admission advice.</p>
    ),
  },
  {
    title: '3. Admissions depend on official KEA counselling',
    body: (
      <p>Actual admission decisions are made exclusively by KEA through its official online counselling rounds. Final allotment depends on the live seat matrix, applicant rank, category certificate verification, document verification, and KEA&apos;s discretion. <b>Nothing on this site overrides or substitutes the official KEA process.</b></p>
    ),
  },
  {
    title: '4. Refer to official KEA notifications',
    body: (
      <p>Always refer to the official KEA portal &mdash; <a className="underline" href="https://cetonline.karnataka.gov.in/" target="_blank" rel="noopener noreferrer">cetonline.karnataka.gov.in</a> &mdash; and KEA&apos;s published brochures and notifications for binding information regarding eligibility, dates, fees, document checklists, and counselling schedules.</p>
    ),
  },
  {
    title: '5. Accuracy of data',
    body: (
      <p>We compile previous-year cutoffs from publicly released KEA documents. While we take care to keep this dataset accurate, we cannot guarantee that every row is free of typos, transcription errors, or rounding. If you spot an error, please email us via the <a className="underline" href="/contact">Contact</a> page.</p>
    ),
  },
  {
    title: '6. No fee, no agent, no influence',
    body: (
      <p>We do not collect any counselling fee on behalf of KEA. We do not act as an admission agent for any college. The only paid product on this site is the optional <b>₹50 Premium PDF report</b>, which is purely a personalised summary of public cutoff data &mdash; it confers no admission benefit.</p>
    ),
  },
]

const disclaimerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Disclaimer',
  description: 'Disclaimer for KCET College Predictor 2026.',
  inLanguage: 'en-IN',
  isPartOf: { '@type': 'WebSite', name: 'KCET Predictor 2026', url: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kcetpredictor.in' },
  dateModified: '2026-06-15',
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-3xl py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(disclaimerJsonLd) }} />
        <h1 className="text-3xl font-bold tracking-tight">Disclaimer</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-muted-foreground">
              This site is <b className="text-foreground">not</b> the official KEA portal. It is an independent tool that predicts engineering colleges using publicly-available previous-year cutoffs. <b className="text-foreground">Always rely on KEA&apos;s official counselling results</b> for any final admission decision.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Full disclaimer</CardTitle>
            <CardDescription>Please read carefully before relying on any prediction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
                <div className="mt-2 text-muted-foreground">{s.body}</div>
                {s.list && (
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                    {s.list.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default App
