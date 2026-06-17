'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Mail, Send, Loader2, MapPin } from 'lucide-react'

function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [setupHint, setSetupHint] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name || !email || !message) { toast.error('All fields are required'); return }
    setBusy(true); setSetupHint(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to send')
      toast.success('Thanks! We’ll get back to you.')
      setName(''); setEmail(''); setMessage('')
      if (j.setup_hint) setSetupHint(j.setup_hint)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 max-w-2xl py-12">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">Questions, feedback, or refund requests — we read everything.</p>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Send us a message</CardTitle>
            <CardDescription>We typically reply within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" />
              </div>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Message
              </Button>
            </form>
            {setupHint && (
              <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <div className="font-semibold">Admin note:</div>
                <pre className="mt-1 whitespace-pre-wrap font-mono">{setupHint}</pre>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> Bengaluru, Karnataka, India
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default App
