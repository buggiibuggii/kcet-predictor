'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Mail, ShieldCheck, ArrowRight } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path fill="#EA4335" d="M12 11v3.2h5.6c-.23 1.5-1.7 4.4-5.6 4.4-3.36 0-6.1-2.78-6.1-6.2s2.74-6.2 6.1-6.2c1.92 0 3.2.82 3.93 1.52l2.68-2.6C16.9 3.6 14.7 2.7 12 2.7 6.97 2.7 2.9 6.77 2.9 11.8s4.07 9.1 9.1 9.1c5.26 0 8.74-3.7 8.74-8.9 0-.6-.06-1.06-.16-1.5H12z"/>
    </svg>
  )
}

function LoginInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const errorParam = sp.get('error')
  const redirect = sp.get('redirect') || '/admin'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState('email') // 'email' | 'otp'
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  useEffect(() => {
    if (errorParam === 'not_admin') {
      toast.error('Your account is not in the admin whitelist.')
    } else if (errorParam) {
      toast.error(errorParam)
    }
  }, [errorParam])

  async function sendOtp(e) {
    e?.preventDefault?.()
    const sb = getBrowserSupabase()
    if (!sb) { toast.error('Supabase not configured'); return }
    if (!email) { toast.error('Enter your email'); return }
    setBusy(true)
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('OTP sent! Check your email inbox.')
    setStage('otp')
  }

  async function verifyOtp(e) {
    e?.preventDefault?.()
    const sb = getBrowserSupabase()
    if (!sb) return
    if (!otp) { toast.error('Enter the OTP'); return }
    setBusy(true)
    const { error } = await sb.auth.verifyOtp({ email, token: otp, type: 'email' })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Logged in!')
    router.push(redirect)
    router.refresh()
  }

  async function googleLogin() {
    const sb = getBrowserSupabase()
    if (!sb) return
    setGoogleBusy(true)
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    })
    if (error) { toast.error(error.message); setGoogleBusy(false) }
  }

  return (
    <div className="container max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Admin Login</CardTitle>
          <CardDescription>Sign in with Google or your email to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full gap-2" onClick={googleLogin} disabled={googleBusy}>
            {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google
          </Button>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or with email OTP</span></div>
          </div>
          <Tabs value={stage} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" onClick={() => setStage('email')}>1. Email</TabsTrigger>
              <TabsTrigger value="otp" disabled={stage === 'email'}>2. OTP</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <form onSubmit={sendOtp} className="space-y-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="mr-2 h-4 w-4" /> Send OTP</>}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="otp">
              <form onSubmit={verifyOtp} className="space-y-3">
                <Label htmlFor="otp">6-digit code sent to {email}</Label>
                <Input id="otp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                <Button variant="ghost" type="button" className="w-full text-xs" onClick={() => setStage('email')}>
                  Use a different email
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">← Back to home</Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">Loading…</div>}>
          <LoginInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
