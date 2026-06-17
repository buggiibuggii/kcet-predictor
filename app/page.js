'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdSlot from '@/components/AdSlot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowRight, GraduationCap, Sparkles, ShieldCheck, Trophy, Zap } from 'lucide-react'

function App() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rank, setRank] = useState('')
  const [category, setCategory] = useState('GM')
  const [course, setCourse] = useState('')
  const [round, setRound] = useState('R1')
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState(['GM', 'GMK', '1G', '2AG', '2BG', '3AG', '3BG', 'SCG', 'STG'])
  const [rounds, setRounds] = useState(['R1', 'R2', 'Extended'])
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/lookup')
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.courses) && data.courses.length) {
          setCourses(data.courses)
          setCourse(data.courses[0].code)
          setDataReady(true)
        }
        if (Array.isArray(data.categories) && data.categories.length) setCategories(data.categories)
        if (Array.isArray(data.rounds) && data.rounds.length) setRounds(data.rounds)
      } catch (e) {
        // ignore
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function onPredict(e) {
    e?.preventDefault?.()
    const r = Number(rank)
    if (!r || r <= 0) {
      toast.error('Please enter a valid KCET rank')
      return
    }
    if (!course) {
      toast.error('Please select a course')
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ rank: String(r), category, course, round })
    router.push(`/results?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
          <div className="container py-16 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> KCET 2026 Counselling Ready
              </div>
              <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
                Find Your Dream College in Karnataka
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Predict your KCET 2026 college admissions instantly using previous-year cutoffs.
                Tier-wise sorted, all rounds, every branch.
              </p>
            </div>

            {/* Predictor Card */}
            <Card className="mx-auto mt-10 max-w-3xl border-primary/20 shadow-2xl shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Predict Your Colleges
                </CardTitle>
                <CardDescription>Enter your details — get colleges in seconds.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onPredict} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="rank">KCET Rank</Label>
                    <Input
                      id="rank"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="e.g. 12500"
                      value={rank}
                      onChange={(e) => setRank(e.target.value)}
                      className="mt-1.5 h-12 text-lg"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Round</Label>
                    <Select value={round} onValueChange={setRound}>
                      <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Select round" /></SelectTrigger>
                      <SelectContent>
                        {rounds.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Course (Branch)</Label>
                    <Select value={course} onValueChange={setCourse} disabled={!courses.length}>
                      <SelectTrigger className="mt-1.5 h-11">
                        <SelectValue placeholder={courses.length ? 'Select course' : 'Loading courses…'} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="font-mono text-xs text-muted-foreground">{c.code}</span> · {c.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 mt-2">
                    <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={loading}>
                      {loading ? 'Predicting…' : 'Predict Colleges'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {!dataReady && (
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        No courses loaded yet? Go to{' '}
                        <a href="/admin" className="text-primary underline">Admin → Seed Demo Data</a>{' '}to get started.
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="mx-auto mt-8 max-w-3xl">
              <AdSlot label="Advertisement — Homepage Banner" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Zap className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">Instant Predictions</CardTitle>
                <CardDescription>Real KEA cutoffs analysed in milliseconds.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Trophy className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">Tier-wise Sorting</CardTitle>
                <CardDescription>Tier-1, Tier-2, Tier-3 — see the best colleges first.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">All Branches Covered</CardTitle>
                <CardDescription>See every branch you can get at every college.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
