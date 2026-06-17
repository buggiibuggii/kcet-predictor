import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export const metadata = {
  title: 'FAQ — KCET College Predictor 2026',
  description: 'Frequently asked questions about KCET 2026 cutoffs, college predictions, and our Premium PDF reports.',
}

const FAQS = [
  { q: 'What is KCET College Predictor 2026?', a: 'It is a free tool that uses previous-year KEA closing ranks to predict the engineering colleges and branches you can get based on your KCET rank, category, and counselling round.' },
  { q: 'How accurate are the predictions?', a: 'Predictions are based on the last published KEA cutoff data. Actual 2026 cutoffs can vary by a small margin depending on the number of seats, applicants, and category-wise distribution. Always cross-check with KEA before final option entry.' },
  { q: 'What do High Chance, Possible, and Dream mean?', a: 'High Chance (Safe) means your rank is comfortably better than the closing cutoff (rank ≤ cutoff × 0.85). Possible means your rank is within 10% of the closing cutoff (rank ≤ cutoff × 1.10). Dream means the cutoff is tighter than your rank — still worth listing as an ambitious option.' },
  { q: 'What rounds are supported?', a: 'R1 (Round 1), R2 (Round 2), and Extended Round. The cutoffs typically loosen across rounds.' },
  { q: 'What is in the Premium PDF report?', a: 'A 6-page PDF: a cover page with your details, separate pages for Dream / Possible / Safe colleges in your selected branch, a full Section B with every obtainable branch across all colleges, and a suggested KEA option-entry order ranking colleges by priority.' },
  { q: 'How much does the Premium PDF cost?', a: '₹50 (fifty rupees) per report via Razorpay. Secure, instant, and the PDF is auto-downloaded plus available in your Supabase storage.' },
  { q: 'Which categories are supported?', a: 'All KEA categories: General Merit (GM/GMR/GMK), Category 1 (1G/1R/1K), 2A/2B/3A/3B variants, SC, ST, Special Categories (Defence, Sports, NCC, PWD, Anglo Indians, etc.) and Regional categories (KK, JK Migrants).' },
  { q: 'Can I upload my own cutoffs?', a: 'Yes — the admin dashboard supports CSV upload for colleges, courses, and cutoffs. Sample headers are shown on the upload page.' },
  { q: 'Is my data private?', a: 'We only store the inputs you submit when you generate a paid report (rank, category, course, round) so the PDF can be regenerated. No personal identification beyond the Razorpay payment id is stored.' },
  { q: 'Can I get a refund?', a: 'PDF reports are instantly generated digital goods. Refunds are not offered in normal cases. If the system fails to deliver a PDF after a successful payment, contact us and we will refund or regenerate.' },
]

function FAQJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-3xl py-12">
        <FAQJsonLd />
        <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="mt-2 text-muted-foreground">Everything about KCET 2026 predictions, cutoffs, and reports.</p>
        <Card className="mt-6">
          <CardContent className="p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default App
