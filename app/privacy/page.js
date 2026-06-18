import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTACT_EMAIL = 'buggi3140@gmail.com'
const LAST_UPDATED = 'June 2026'

export const metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for KCET College Predictor 2026. How we handle your inputs, sign-in data, payments, reports, cookies and AdSense personalisation.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy — KCET Predictor 2026', type: 'article' },
}

const SECTIONS = [
  {
    title: '1. Information you provide',
    body: (
      <>
        <p>To use the free predictor, you submit your <b>KCET rank</b>, <b>category</b>, <b>round</b> and <b>course (branch)</b>. These inputs are processed by our server to compute predictions and are stored only when you purchase a Premium PDF report (so the report can be regenerated and audited).</p>
        <p className="mt-2">You may optionally sign in using <b>Google OAuth</b> or <b>email one-time password (OTP)</b> via Supabase Auth. Signing in is required only to access the Admin Dashboard. We store the email address and authentication tokens associated with your session — nothing more.</p>
      </>
    ),
  },
  {
    title: '2. Payments via Razorpay',
    body: (
      <>
        <p>Premium PDF reports are processed by <b>Razorpay</b>. When you click &ldquo;Download Premium PDF Report&rdquo;, we create an order with Razorpay and hand off the checkout to Razorpay&apos;s secure hosted UI. <b>We never see or store your card / UPI / bank account details</b> &mdash; those go directly to Razorpay.</p>
        <p className="mt-2">After successful payment, we store a record of the transaction (<code>payment_id</code>, amount, and status) plus the report metadata (rank, category, course, round, and the Supabase Storage URL of your PDF). Refer to <a className="underline" href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay&apos;s privacy policy</a> for details on payment data handling.</p>
      </>
    ),
  },
  {
    title: '3. Reports stored in Supabase Storage',
    body: (
      <>
        <p>Premium PDF reports are uploaded to a Supabase Storage bucket named <code>reports</code> and a public URL is generated so you can download the PDF. The URL is also saved to the <code>reports</code> table for re-download. PDFs contain only the prediction details derived from your inputs &mdash; no personally identifying information beyond what you submitted.</p>
        <p className="mt-2">Supabase hosts our database and storage. See <a className="underline" href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase&apos;s privacy policy</a> for details on their data handling.</p>
      </>
    ),
  },
  {
    title: '4. Cookies, analytics & advertising',
    body: (
      <>
        <p>We use the following cookies and similar technologies:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li><b>Session cookies</b> for signed-in users (Supabase Auth).</li>
          <li><b>Theme preference</b> stored locally to remember light/dark mode.</li>
          <li><b>Service Worker cache</b> for offline support (PWA).</li>
          <li><b>Google AdSense</b> cookies and the <a className="underline" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">DoubleClick advertising cookie</a> for showing personalised ads and measuring ad performance.</li>
        </ul>
        <p className="mt-2">Google and its partners may serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising via the <a className="underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a> page.</p>
      </>
    ),
  },
  {
    title: '5. Sharing & third parties',
    body: (
      <p>We do <b>not</b> sell or rent your personal data. The only third parties involved are: Supabase (database, auth, storage), Razorpay (payments), and Google (AdSense). Each of these has its own privacy policy linked above. We share with them only the minimum data needed to deliver the service you requested.</p>
    ),
  },
  {
    title: '6. Data retention',
    body: (
      <p>Prediction inputs are persisted only for reports that you have paid for, and remain until you ask us to delete them. Payment records are retained as required by Razorpay and Indian tax / accounting rules. You can email us anytime to request deletion of your data (subject to legal retention requirements).</p>
    ),
  },
  {
    title: '7. Your rights',
    body: (
      <p>You can request access, correction, or deletion of your data by emailing us. You may withdraw consent for marketing / personalisation cookies via your browser settings or the Google Ads Settings link above.</p>
    ),
  },
  {
    title: '8. Contact',
    body: (
      <p>Questions or requests &mdash; reach us at <a className="underline text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to respond within 5 working days.</p>
    ),
  },
]

const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Privacy Policy',
  description: 'Privacy Policy for KCET College Predictor 2026.',
  inLanguage: 'en-IN',
  isPartOf: { '@type': 'WebSite', name: 'KCET Predictor 2026', url: process.env.NEXT_PUBLIC_BASE_URL || 'https://kcetpredictor.com' },
  dateModified: '2026-06-15',
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-3xl py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }} />
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              We collect the minimum data needed to predict colleges and process ₹50 Premium PDF orders. We never sell your data. Sign-in is optional and required only for the Admin Dashboard.
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
