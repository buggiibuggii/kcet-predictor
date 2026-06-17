import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Sparkles, ShieldCheck, FileDown } from 'lucide-react'

export const metadata = {
  title: 'About — KCET College Predictor 2026',
  description: 'About KCET College Predictor 2026 — a free, fast, and accurate KEA cutoff-based college predictor for Karnataka engineering aspirants.',
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-4xl py-12">
        <h1 className="text-3xl font-bold tracking-tight">About KCET Predictor 2026</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Built for Karnataka engineering aspirants. Free for predictions, premium for an in-depth 6-page report you can use during counselling.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle>Why we built this</CardTitle>
              <CardDescription>
                Most aspirants spend hours scrolling PDFs of KEA cutoffs. We compressed that pain into a single rank lookup.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <GraduationCap className="h-6 w-6 text-primary" />
              <CardTitle>Every branch, every category</CardTitle>
              <CardDescription>
                34 KEA reservation categories, 3 counselling rounds, every branch — sorted by Tier-1, Tier-2, Tier-3.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <FileDown className="h-6 w-6 text-primary" />
              <CardTitle>The Premium 6-page PDF</CardTitle>
              <CardDescription>
                Dream, Possible, Safe split; tier-sorted Section B; a printable KEA option-entry order. ₹50, instant.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-primary" />
              <CardTitle>Privacy first</CardTitle>
              <CardDescription>
                We only store the inputs you submit when generating a paid report. No personal identifiers beyond Razorpay metadata.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How the prediction works</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              For your selected category and round, we look up the closing rank for every college–course pair from
              previous KEA cutoffs. We then label each result:
            </p>
            <ul className="mt-2 space-y-1">
              <li><b>Safe / High Chance:</b> rank ≤ cutoff × 0.85 — strong safety net</li>
              <li><b>Possible:</b> rank ≤ cutoff × 1.10 — realistic target</li>
              <li><b>Dream:</b> otherwise — a stretch worth listing</li>
            </ul>
            <p className="mt-2">Section A lists your selected branch across colleges; Section B lists every branch you can get at each college.</p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default App
