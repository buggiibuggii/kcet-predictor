'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, FileDown, Loader2, RefreshCcw, XCircle } from 'lucide-react'
import { useIsEmbedded } from '@/lib/useIsEmbedded'

function triggerDownload(url, filename = 'KCET_Premium_Report.pdf') {
  try {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    window.open(url, '_blank')
  }
}

// Ensures the Razorpay checkout SDK is loaded.
function loadRazorpaySdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))
    if (window.Razorpay) return resolve()
    const existing = document.getElementById('razorpay-checkout-js')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Razorpay SDK failed to load')), { once: true })
      return
    }
    const s = document.createElement('script')
    s.id = 'razorpay-checkout-js'
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Razorpay SDK failed to load'))
    document.head.appendChild(s)
  })
}

export default function PremiumPdfButton({ input }) {
  const isEmbedded = useIsEmbedded()
  const [processing, setProcessing] = useState(false)
  // 'idle' | 'embedded' | 'verifying' | 'success' | 'error'
  // NOTE: We deliberately do NOT open our Dialog during 'creating' or
  // 'checkout' stages. Radix Dialog applies `pointer-events:none` /
  // `inert` / focus-trap on body-level siblings, which would break input
  // focus inside Razorpay's checkout iframe (mobile no., OTP, etc.).
  const [stage, setStage] = useState('idle')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [open, setOpen] = useState(false)
  const pendingErrorRef = useRef(null)

  // Warm up Razorpay SDK in the background so the click handler can stay synchronous-ish.
  useEffect(() => { loadRazorpaySdk().catch(() => {}) }, [])

  function openInNewTab() {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '/'
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) { /* ignore */ }
  }

  async function startPayment() {
    setErrorMsg('')
    setPdfUrl(null)

    if (isEmbedded) {
      setStage('embedded')
      setOpen(true)
      return
    }

    setProcessing(true)
    const orderToast = toast.loading('Creating secure Razorpay order…')

    try {
      // 1) Ensure SDK is ready
      await loadRazorpaySdk()

      // 2) Create order on server
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error || 'Failed to create payment order')

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded yet. Please retry in a moment.')
      }

      toast.dismiss(orderToast)

      // 3) Hand off to Razorpay. CRITICAL: our Dialog must NOT be open here,
      // otherwise Radix' modal-mode blocks Razorpay's iframe inputs.
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'KCET Predictor 2026',
        description: 'Premium College Report PDF',
        order_id: order.orderId,
        notes: { rank: String(input.rank), course: input.course || '', round: input.round },
        prefill: { contact: '', email: '', name: '' },
        theme: { color: '#4F46E5' },
        modal: {
          escape: true,
          backdropclose: false,
          ondismiss: () => {
            setProcessing(false)
            // If Razorpay reported a payment failure right before the user
            // dismissed the modal, surface our error Dialog now. Otherwise
            // treat it as a clean cancellation.
            if (pendingErrorRef.current) {
              setErrorMsg(pendingErrorRef.current)
              setStage('error')
              setOpen(true)
              pendingErrorRef.current = null
            } else {
              setStage('idle')
              setOpen(false)
              toast.message('Payment cancelled')
            }
          },
        },
        handler: async (response) => {
          // Razorpay has closed its iframe; safe to open OUR dialog now.
          setStage('verifying')
          setOpen(true)
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                input,
              }),
            })
            const data = await verifyRes.json()
            if (!verifyRes.ok || !data.ok) throw new Error(data.error || 'Verification failed')
            setPdfUrl(data.pdfUrl)
            setStage('success')
            toast.success('Payment successful — your premium report is ready!')
            if (data.pdfUrl) triggerDownload(data.pdfUrl)
          } catch (e) {
            setErrorMsg(e.message)
            setStage('error')
            toast.error(e.message)
          } finally {
            setProcessing(false)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', async (resp) => {
        const desc = resp?.error?.description || 'Payment failed'
        // Stash the error; ondismiss will open our Dialog AFTER Razorpay
        // closes — so the two never overlap.
        pendingErrorRef.current = desc
        setProcessing(false)
        try {
          await fetch('/api/payment/record-failure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: resp?.error?.metadata?.payment_id || null,
              description: desc,
            }),
          })
        } catch (e) { /* swallow log failures */ }
        toast.error(desc)
      })
      rzp.open()
    } catch (e) {
      toast.dismiss(orderToast)
      setErrorMsg(e.message)
      setStage('error')
      setOpen(true)
      setProcessing(false)
      toast.error(e.message)
    }
  }

  function retry() {
    setOpen(false)
    setTimeout(() => startPayment(), 100)
  }

  // Render the button OUTSIDE any Dialog/Popover/Tabs that might constrain it.
  // We use the Radix Dialog only AFTER Razorpay closes so the two never overlap.
  return (
    <>
      {/* Backup: preload checkout.js. The script tag may double up with the JS loader
          above; the loader short-circuits if window.Razorpay already exists. */}
      <Script id="rzp-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <Button onClick={startPayment} disabled={processing} className="gap-2" data-rzp-trigger>
        {processing
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
          : <><FileDown className="h-4 w-4" /> Download Premium PDF Report · ₹50</>}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!processing) setOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stage === 'embedded' && <span className="flex items-center gap-2 text-amber-600"><ExternalLink className="h-5 w-5" /> Open in a new tab to pay</span>}
              {stage === 'success' && <span className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Payment Successful</span>}
              {stage === 'error' && <span className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> Payment Failed</span>}
              {stage === 'verifying' && <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Verifying payment & generating PDF…</span>}
            </DialogTitle>
            <DialogDescription>
              {stage === 'embedded' && (
                <>
                  You appear to be viewing this app inside an embedded preview frame. Razorpay&apos;s checkout requires a top-level window to capture the mobile-number and OTP fields reliably.
                  <br /><br />
                  Click <b>Open in new tab</b> below — the app will reopen in a normal browser tab where the payment flow works without any restrictions.
                </>
              )}
              {stage === 'verifying' && 'We are verifying your payment and generating your 6-page premium report. This usually takes 5–10 seconds.'}
              {stage === 'success' && 'Your premium PDF report has been generated, uploaded securely, and the download has started.'}
              {stage === 'error' && (errorMsg || 'Something went wrong.')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {stage === 'embedded' && (
              <>
                <Button onClick={openInNewTab} className="w-full sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </>
            )}
            {stage === 'success' && pdfUrl && (
              <Button asChild className="w-full sm:w-auto">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF again
                </a>
              </Button>
            )}
            {stage === 'error' && (
              <Button onClick={retry} variant="default" className="w-full sm:w-auto">
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry Payment
              </Button>
            )}
            {(stage === 'success' || stage === 'error') && (
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
