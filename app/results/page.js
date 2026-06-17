'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdSlot from '@/components/AdSlot'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PremiumPdfButton from '@/components/PremiumPdfButton'
import EmbeddedNotice from '@/components/EmbeddedNotice'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Download, FileDown, Loader2, MapPin, School, Sparkles } from 'lucide-react'

function ChanceBadge({ chance }) {
  if (chance === 'High' || chance === 'Safe')
    return <Badge className="bg-emerald-500 hover:bg-emerald-500">Safe</Badge>
  if (chance === 'Possible')
    return <Badge className="bg-amber-500 hover:bg-amber-500">Possible</Badge>
  return <Badge variant="secondary">Dream</Badge>
}

function TierBadge({ tier }) {
  const t = String(tier || '').toUpperCase()
  const cls = t === 'T1'
    ? 'bg-violet-500 hover:bg-violet-500'
    : t === 'T2'
      ? 'bg-blue-500 hover:bg-blue-500'
      : 'bg-slate-500 hover:bg-slate-500'
  return <Badge className={cls}>{t || 'T?'}</Badge>
}

function OptionEntryOrder({ sectionA, sectionB }) {
  // Combine: for each obtainable college (Section B) emit each branch as an option row.
  // Also include Dream entries from Section A (selected course) so user sees a full picture.
  const rows = []
  for (const c of sectionB) {
    for (const co of c.courses) {
      rows.push({
        college_name: c.college_name, college_code: c.college_code, tier: c.tier,
        course_code: co.course_code, course_name: co.course_name,
        closing_rank: co.closing_rank, chance: co.chance,
      })
    }
  }
  for (const r of sectionA) {
    if (r.chance === 'Dream') {
      rows.push({
        college_name: r.college_name, college_code: r.college_code, tier: r.tier,
        course_code: r.course_code, course_name: r.course_name,
        closing_rank: r.closing_rank, chance: 'Dream',
      })
    }
  }
  const order = { High: 0, Safe: 0, Possible: 1, Dream: 2 }
  rows.sort((a, b) => {
    const oa = order[a.chance] ?? 9, ob = order[b.chance] ?? 9
    if (oa !== ob) return oa - ob
    const ta = parseInt(String(a.tier).replace(/\D/g, '')) || 9
    const tb = parseInt(String(b.tier).replace(/\D/g, '')) || 9
    if (ta !== tb) return ta - tb
    return a.closing_rank - b.closing_rank
  })
  const limited = rows.slice(0, 80)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested KCET Option-Entry Order</CardTitle>
        <CardDescription>
          KEA recommends starting with Safe options (lock the safety net), then Possible, then a few Dream picks at the bottom. Use this ordering as a starting point.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[260px]">College</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Cutoff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limited.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No recommendations.</TableCell></TableRow>}
              {limited.map((r, i) => (
                <TableRow key={`${r.college_code}-${r.course_code}-${i}`}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell><ChanceBadge chance={r.chance} /></TableCell>
                  <TableCell>
                    <div className="font-medium">{r.college_name}</div>
                    <div className="text-xs text-muted-foreground"><span className="font-mono">{r.college_code}</span></div>
                  </TableCell>
                  <TableCell><TierBadge tier={r.tier} /></TableCell>
                  <TableCell>
                    <div className="text-sm">{r.course_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.course_code}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{Number(r.closing_rank).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultsInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const rank = sp.get('rank')
  const category = sp.get('category')
  const course = sp.get('course')
  const round = sp.get('round')
  const year = sp.get('year')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rank, category, course, round, year }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error || 'Failed to predict')
        if (!cancelled) setData(j)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (rank && category && round) load()
    else { setError('Missing input. Please use the home page.'); setLoading(false) }
    return () => { cancelled = true }
  }, [rank, category, course, round, year])

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Crunching cutoffs…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-20">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sectionA = data?.sectionA || []
  const sectionB = data?.sectionB || []

  return (
    <div className="container py-8">
      {/* Summary bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your Predicted Colleges</h1>
          <p className="text-sm text-muted-foreground">
            Rank <span className="font-semibold text-foreground">{rank}</span> · Category <span className="font-semibold text-foreground">{category}</span> · Round <span className="font-semibold text-foreground">{round}</span> · Course <span className="font-semibold text-foreground">{course}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Free prediction generated successfully.
          </div>
        </div>
        <PremiumPdfButton input={{ rank: Number(rank), category, course, round, year: year ? Number(year) : null }} />
      </div>

      <div className="mt-6">
        <EmbeddedNotice />
      </div>

      <div className="mt-6">
        <AdSlot label="Advertisement — Results Page Banner" />
      </div>

      <Tabs defaultValue="sectionA" className="mt-6">
        <TabsList>
          <TabsTrigger value="sectionA">
            <School className="mr-2 h-4 w-4" /> Section A · Selected Course ({sectionA.length})
          </TabsTrigger>
          <TabsTrigger value="sectionB">
            <Sparkles className="mr-2 h-4 w-4" /> Section B · All Obtainable Branches ({sectionB.length})
          </TabsTrigger>
          <TabsTrigger value="optionOrder">
            <FileDown className="mr-2 h-4 w-4" /> Suggested Option Order
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sectionA" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Best Colleges for Your Selected Course</CardTitle>
              <CardDescription>Sorted by tier, then by cutoff competitiveness.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>College</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Previous Cutoff</TableHead>
                      <TableHead>Chance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionA.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No colleges match for this selection. Try a different round/category, or seed demo data via Admin.</TableCell></TableRow>
                    )}
                    {sectionA.map((r, idx) => (
                      <TableRow key={`${r.college_code}-${idx}`}>
                        <TableCell>
                          <div className="font-medium">{r.college_name}</div>
                          {r.city && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {r.city} · <span className="font-mono">{r.college_code}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell><TierBadge tier={r.tier} /></TableCell>
                        <TableCell>
                          <div className="text-sm">{r.course_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.course_code}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{r.closing_rank.toLocaleString()}</TableCell>
                        <TableCell><ChanceBadge chance={r.chance} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectionB" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Colleges & All Obtainable Branches</CardTitle>
              <CardDescription>Every branch you have a High or Possible chance at — across all colleges.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[260px]">College</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Courses You Can Get</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionB.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No colleges obtainable at this rank.</TableCell></TableRow>
                    )}
                    {sectionB.map((c) => (
                      <TableRow key={c.college_code} className="align-top">
                        <TableCell>
                          <div className="font-medium">{c.college_name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {c.city} · <span className="font-mono">{c.college_code}</span>
                          </div>
                        </TableCell>
                        <TableCell><TierBadge tier={c.tier} /></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {c.courses.map((co) => (
                              <span
                                key={co.course_code}
                                className={
                                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ' +
                                  (co.chance === 'High'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300')
                                }
                                title={`${co.course_name} · cutoff ${co.closing_rank}`}
                              >
                                <span className="font-medium">{co.course_code}</span>
                                <span className="text-muted-foreground">· {co.closing_rank.toLocaleString()}</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optionOrder" className="mt-4">
          <OptionEntryOrder sectionA={sectionA} sectionB={sectionB} />
        </TabsContent>
      </Tabs>

      <div className="mt-10">
        <AdSlot label="Advertisement — Bottom Banner" />
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
          <ResultsInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
