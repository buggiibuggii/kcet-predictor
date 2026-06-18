'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdSlot from '@/components/AdSlot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowRight, GraduationCap, Sparkles, ShieldCheck, Trophy, Zap, MapPin, Languages, Award } from 'lucide-react'
import { BASE_CATEGORIES, SPECIAL_CATEGORIES } from '@/lib/quotaEngine'

function App() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rank, setRank] = useState('')
  const [baseCategory, setBaseCategory] = useState('GM')
  const [rural, setRural] = useState(false)
  const [kannada, setKannada] = useState(false)
  const [special, setSpecial] = useState([]) // array of codes
  const [course, setCourse] = useState('')
  const [round, setRound] = useState('')
  const [courses, setCourses] = useState([])
  const [rounds, setRounds] = useState([])
  const [latestYear, setLatestYear] = useState(null)
  const [dataDriven, setDataDriven] = useState(false)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/lookup')
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.courses)) {
          setCourses(data.courses)
          if (data.courses.length) setCourse(data.courses[0].code)
        }
        if (Array.isArray(data.rounds) && data.rounds.length) {
          setRounds(data.rounds)
          setRound(data.rounds[0])
        }
        if (data.latest_year != null) setLatestYear(data.latest_year)
        setDataDriven(!!data.data_driven)
        setDataReady(true)
      } catch (e) { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Live preview of eligible quota chain so the user understands what we'll check.
  const eligibleChain = useMemo(() => {
    const base = String(baseCategory || 'GM').toUpperCase()
    const chain = []
    if (rural) chain.push(`${base}R`)
    if (kannada) chain.push(`${base}K`)
    chain.push(base === 'GM' ? 'GM' : `${base}G`)
    if (base !== 'GM') {
      if (rural) chain.push('GMR')
      if (kannada) chain.push('GMK')
      chain.push('GM')
    }
    for (const s of special) chain.push(s)
    return chain
  }, [baseCategory, rural, kannada, special])

  function toggleSpecial(code) {
    setSpecial((s) => s.includes(code) ? s.filter((x) => x !== code) : [...s, code])
  }

  function onPredict(e) {
    e?.preventDefault?.()
    const r = Number(rank)
    if (!r || r <= 0) { toast.error('Please enter a valid KCET rank'); return }
    if (!course) { toast.error('Please select a course'); return }
    if (!round) { toast.error('Please select a round'); return }
    if (!baseCategory) { toast.error('Please select your category'); return }
    setLoading(true)
    const params = new URLSearchParams({
      rank: String(r),
      baseCategory,
      rural: rural ? '1' : '0',
      kannada: kannada ? '1' : '0',
      special: special.join(','),
      course,
      round,
    })
    router.push(`/results?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
          <div className="container py-16 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> KCET 2026 Counselling Ready · Multi-Quota Engine
              </div>
              <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
                Find Your Dream College in Karnataka
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Predicts via every quota you qualify for — Rural, Kannada, General &amp; Special — and shows the best chance for each college.
              </p>
            </div>

            <Card className="mx-auto mt-10 max-w-3xl border-primary/20 shadow-2xl shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Predict Your Colleges</CardTitle>
                <CardDescription>
                  {dataDriven
                    ? `Live cutoffs in database${latestYear ? ` — using ${latestYear} (latest)` : ''}.`
                    : 'No cutoff data yet — admin can upload KEA CSVs to power the predictor.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onPredict} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="rank">KCET Rank</Label>
                    <Input id="rank" type="number" min={1} inputMode="numeric" placeholder="e.g. 12500" value={rank} onChange={(e) => setRank(e.target.value)} className="mt-1.5 h-12 text-lg" />
                  </div>

                  <div>
                    <Label>Base Category</Label>
                    <Select value={baseCategory} onValueChange={setBaseCategory}>
                      <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {BASE_CATEGORIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="font-mono text-xs text-muted-foreground">{c.code}</span> · {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Round</Label>
                    {dataReady ? (
                      <Select key={`r-${rounds.length}`} value={round || undefined} onValueChange={setRound}>
                        <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder={rounds.length ? 'Select round' : 'No rounds yet'} /></SelectTrigger>
                        <SelectContent>
                          {rounds.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1.5 h-11 rounded-md border border-input bg-muted/30" />
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Course (Branch)</Label>
                    {dataReady ? (
                      <Select key={`c-${courses.length}`} value={course || undefined} onValueChange={setCourse} disabled={!courses.length}>
                        <SelectTrigger className="mt-1.5 h-11">
                          <SelectValue placeholder={courses.length ? 'Select course' : 'No courses yet'} />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="font-mono text-xs text-muted-foreground">{c.code}</span> · {c.course_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1.5 h-11 rounded-md border border-input bg-muted/30" />
                    )}
                  </div>

                  {/* Eligibility flags */}
                  <div className="sm:col-span-2 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4">
                    <div className="mb-3 text-sm font-medium">Eligibility (tick all that apply)</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 hover:border-primary/40">
                        <Checkbox checked={rural} onCheckedChange={(v) => setRural(!!v)} className="mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1 text-sm font-medium"><MapPin className="h-3.5 w-3.5" /> Rural Quota</div>
                          <div className="text-xs text-muted-foreground">Studied SSLC + PUC in rural Karnataka (KEA verified).</div>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3 hover:border-primary/40">
                        <Checkbox checked={kannada} onCheckedChange={(v) => setKannada(!!v)} className="mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1 text-sm font-medium"><Languages className="h-3.5 w-3.5" /> Kannada Medium</div>
                          <div className="text-xs text-muted-foreground">Studied in Kannada-medium for at least 1 year.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Special categories */}
                  <div className="sm:col-span-2 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Award className="h-3.5 w-3.5" /> Special Quotas (optional)</div>
                    <div className="mb-3 text-xs text-muted-foreground">Pick any quotas you have official KEA-verified eligibility for.</div>
                    <div className="flex flex-wrap gap-2">
                      {SPECIAL_CATEGORIES.map((s) => {
                        const active = special.includes(s.code)
                        return (
                          <button
                            type="button"
                            key={s.code}
                            onClick={() => toggleSpecial(s.code)}
                            className={
                              'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                              (active
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-amber-500/30 bg-background text-foreground hover:bg-amber-500/10')
                            }
                            title={s.name}
                          >
                            {s.code}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live preview of the quota chain */}
                  <div className="sm:col-span-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">We will evaluate cutoffs for: </span>
                    {eligibleChain.map((c, i) => (
                      <span key={`${c}-${i}`} className="ml-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">{c}</span>
                    ))}
                  </div>

                  <div className="sm:col-span-2 mt-2">
                    <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={loading || !dataDriven}>
                      {loading ? 'Predicting…' : 'Predict Colleges'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {dataReady && !dataDriven && (
                      <p className="mt-3 text-center text-xs text-amber-600">
                        No KEA cutoff data uploaded yet. Go to{' '}
                        <a href="/admin" className="text-primary underline">Admin → CSV Upload</a> and import your data.
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

        <section className="container py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader><Zap className="h-6 w-6 text-primary" /><CardTitle className="text-base">Multi-Quota Engine</CardTitle><CardDescription>Evaluates Rural, Kannada, General &amp; GM fallback simultaneously.</CardDescription></CardHeader></Card>
            <Card><CardHeader><Trophy className="h-6 w-6 text-primary" /><CardTitle className="text-base">5-Tier Confidence</CardTitle><CardDescription>Safe · High Chance · Borderline · Low Chance · Not Likely — no false negatives.</CardDescription></CardHeader></Card>
            <Card><CardHeader><ShieldCheck className="h-6 w-6 text-primary" /><CardTitle className="text-base">Eligible-Via Badges</CardTitle><CardDescription>See exactly which quota qualifies you at each college.</CardDescription></CardHeader></Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default App
