'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CheckCircle2, FileDown, Loader2, RefreshCcw, XCircle } from 'lucide-react'

function triggerDownload(url, filename = 'KCET_Premium_Report.pdf') {
  // Open in new tab as a download — works with Supabase public URLs.
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

export default function PremiumPdfButton({ input }) {
  const [processing, setProcessing] = useState(false)
  const [stage, setStage] = useState('idle') // 'idle' | 'creating' | 'checkout' | 'verifying' | 'success' | 'error'
  const [pdfUrl, setPdfUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [open, setOpen] = useState(false)

  async function startPayment() {
    setErrorMsg('')
    setPdfUrl(null)
    setProcessing(true)
    setStage('creating')
    setOpen(true)
    try {
      // 1) Create order on server
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error || 'Failed to create payment order')

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Razorpay SDK not loaded yet. Please retry in a moment.')
      }

      setStage('checkout')
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'KCET Predictor 2026',
        description: 'Premium College Report PDF',
        order_id: order.orderId,
        notes: { rank: String(input.rank), category: input.category, course: input.course, round: input.round },
        prefill: { contact: '9999999999', email: 'student@kcetpredictor.in', name: 'KCET Student' },
        theme: { color: '#4F46E5' },
        modal: {
          ondismiss: () => {
            setProcessing(false)
            setStage('idle')
            setOpen(false)
            toast.message('Payment cancelled')
          },
        },
        handler: async (response) => {
          try {
            setStage('verifying')
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
        setErrorMsg(desc)
        setStage('error')
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
        } catch (e) {}
        toast.error(desc)
      })
      rzp.open()
    } catch (e) {
      setErrorMsg(e.message)
      setStage('error')
      setProcessing(false)
      toast.error(e.message)
    }
  }

  function retry() {
    setOpen(false)
    setTimeout(() => startPayment(), 100)
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button onClick={startPayment} disabled={processing} className="gap-2">
        {processing
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
          : <><FileDown className="h-4 w-4" /> Download Premium PDF Report · ₹50</>}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!processing) setOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stage === 'success' && <span className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Payment Successful</span>}
              {stage === 'error' && <span className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> Payment Failed</span>}
              {(stage === 'creating' || stage === 'verifying' || stage === 'checkout') &&
                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> {stage === 'creating' ? 'Creating order…' : stage === 'verifying' ? 'Verifying payment & generating PDF…' : 'Opening checkout…'}</span>}
            </DialogTitle>
            <DialogDescription>
              {stage === 'creating' && 'Setting up a secure Razorpay order for ₹50.'}
              {stage === 'checkout' && 'Please complete the payment in the Razorpay popup.'}
              {stage === 'verifying' && 'We are verifying your payment and generating your 6-page premium report. This usually takes 5–10 seconds.'}
              {stage === 'success' && 'Your premium PDF report has been generated, uploaded securely, and the download has started.'}
              {stage === 'error' && (errorMsg || 'Something went wrong.')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
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
