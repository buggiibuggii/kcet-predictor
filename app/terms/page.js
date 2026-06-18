import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'buggi3140@gmail.com'
const LAST_UPDATED = 'June 2026'

export const metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms & Conditions for KCET College Predictor 2026. Estimates only, no admission guarantee, ₹50 PDF is non-refundable after delivery, official KEA verification required.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms & Conditions — KCET Predictor 2026', type: 'article' },
}

const SECTIONS = [
  {
    title: '1. Nature of the service',
    body: (
      <p>KCET College Predictor 2026 provides <b>estimates</b> of probable engineering colleges in Karnataka based on previous-year KEA closing ranks and category-wise cutoffs. The service is provided on an &quot;as-is&quot; basis for informational and educational purposes only.</p>
    ),
  },
  {
    title: '2. No admission guarantee',
    body: (
      <p>Predictions <b>do not guarantee admission</b> to any college, course, or branch. Final admissions are governed entirely by the Karnataka Examinations Authority (KEA) counselling process and depend on factors outside our control: number of seats, seat-matrix changes, applicant pool, reservation rules, and KEA&apos;s own decisions.</p>
    ),
  },
  {
    title: '3. Premium PDF reports (₹50)',
    body: (
      <>
        <p>The Premium PDF report is a <b>digital product</b> delivered instantly via Razorpay and Supabase Storage. By purchasing, you consent to immediate delivery of the digital good.</p>
        <p className="mt-2">Reports are <b>generally non-refundable after successful delivery</b>, since they are generated and downloaded on demand. We will refund or regenerate <b>only</b> if our system fails to deliver the PDF after a successful payment (e.g., upload error). Contact <a className="underline text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within 48 hours of payment with your <code>payment_id</code> for resolution.</p>
      </>
    ),
  },
  {
    title: '4. Verify with KEA',
    body: (
      <p>Users are <b>required</b> to verify all information &mdash; cutoffs, seat matrix, college codes, counselling deadlines &mdash; from <a className="underline" href="https://cetonline.karnataka.gov.in/" target="_blank" rel="noopener noreferrer">official KEA sources</a> before submitting option entries or accepting an allotment. We are not responsible for decisions made solely on the basis of our predictions.</p>
    ),
  },
  {
    title: '5. Acceptable use',
    body: (
      <>
        <p>You agree <b>not</b> to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Use bots, scrapers, or any automated means to access the service without our prior written permission.</li>
          <li>Submit fraudulent payments, chargebacks, or manipulated rank inputs.</li>
          <li>Reproduce, resell, or redistribute the Premium PDF report or its derivative data without permission.</li>
          <li>Interfere with the operation of the website, attempt to bypass authentication, or probe for vulnerabilities.</li>
          <li>Use the service to violate any applicable Indian or local laws.</li>
        </ul>
        <p className="mt-2">We may rate-limit, suspend, or permanently block any IP or account that violates these terms.</p>
      </>
    ),
  },
  {
    title: '6. Intellectual property',
    body: (
      <p>The KCET Predictor brand, the source code, the PDF design and the aggregated cutoff database are owned by us. Underlying cutoff numbers are public information published by KEA. You may use the predictions for personal counselling decisions; you may not resell or commercially redistribute them.</p>
    ),
  },
  {
    title: '7. Limitation of liability',
    body: (
      <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total aggregate liability for any direct claim shall not exceed the amount you paid us (typically ₹50 for a single Premium PDF order).</p>
    ),
  },
  {
    title: '8. Changes to these terms',
    body: (
      <p>We may update these Terms from time to time. The &quot;Last updated&quot; date at the top reflects the latest revision. Continued use after a change constitutes acceptance of the revised Terms.</p>
    ),
  },
  {
    title: '9. Governing law',
    body: (
      <p>These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.</p>
    ),
  },
  {
    title: '10. Contact',
    body: (
      <p>For any questions about these Terms, reach us at <a className="underline text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    ),
  },
]

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Terms & Conditions',
  description: 'Terms & Conditions for KCET College Predictor 2026.',
  inLanguage: 'en-IN',
  isPartOf: { '@type': 'WebSite', name: 'KCET Predictor 2026', url: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kcetpredictor.in' },
  dateModified: '2026-06-15',
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-3xl py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }} />
        <h1 className="text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Predictions are estimates and do not guarantee admission. The ₹50 Premium PDF is a digital product, generally non-refundable after successful delivery. Always cross-check with official KEA sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
                <div className="mt-2 text-muted-foreground">{s.body}</div>
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
