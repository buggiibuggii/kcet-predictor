'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
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
import { ArrowLeft, CheckCircle2, FileDown, Loader2, MapPin, School, Sparkles, Layers } from 'lucide-react'
import { CONFIDENCE_LIST, CONFIDENCE_COLORS } from '@/lib/quotaEngine'

function ConfidenceBadge({ confidence }) {
  const cfg = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS['Borderline']
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: cfg.hex }}
    >
      {cfg.emoji} {confidence}
    </span>
  )
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

function QuotaChips({ quotas, best }) {
  if (!quotas || !quotas.length) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {quotas.map((q) => (
        <span
          key={q.code}
          className={
            'rounded px-1.5 py-0.5 font-mono text-[10px] ' +
            (q.code === best
              ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground')
          }
          title={`${q.label} · cutoff ${q.cutoff}`}
        >
          {q.code === best && '✓ '}{q.code}
        </span>
      ))}
    </div>
  )
}

function ResultRow({ r }) {
  const marginStr = (r.margin >= 0 ? '+' : '') + r.margin.toFixed(1) + '%'
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{r.college_name}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {r.city && <><MapPin className="h-3 w-3" /> {r.city} · </>}
          <span className="font-mono">{r.college_code}</span>
        </div>
        <div className="mt-1 text-xs">
          <span className="text-muted-foreground">Eligible via: </span>
          <QuotaChips quotas={r.matchedQuotas?.length ? r.matchedQuotas : r.consideredQuotas} best={r.bestQuota} />
        </div>
      </TableCell>
      <TableCell><TierBadge tier={r.tier} /></TableCell>
      <TableCell>
        <div className="text-sm">{r.course_name}</div>
        <div className="font-mono text-xs text-muted-foreground">{r.course_code}</div>
      </TableCell>
      <TableCell className="text-right">
        <div className="font-mono">{Number(r.bestCutoff).toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground">via {r.bestQuota}</div>
      </TableCell>
      <TableCell className="text-right font-mono">{marginStr}</TableCell>
      <TableCell className="text-right">
        <div className="font-semibold">{r.probability}%</div>
        <ConfidenceBadge confidence={r.confidence} />
      </TableCell>
    </TableRow>
  )
}

function GroupSection({ confidence, rows }) {
  const cfg = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS['Borderline']
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-l-4" style={{ borderLeftColor: cfg.hex }}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>{cfg.emoji}</span> {confidence}
          <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
        </CardTitle>
        <CardDescription>
          {confidence === 'Safe' && 'Cutoff ≥ 20% above your rank — strong safety net.'}
          {confidence === 'High Chance' && 'Cutoff 10–20% above your rank — highly likely.'}
          {confidence === 'Borderline' && 'Cutoff within 10% of your rank — depends on counselling round.'}
          {confidence === 'Low Chance' && 'Your rank is just above the previous cutoff — try at own risk.'}
          {confidence === 'Not Likely' && 'Far above last year’s cutoff — listed for reference only.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">College</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Best Cutoff</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No colleges in this bucket.</TableCell></TableRow>
              )}
              {rows.map((r, i) => <ResultRow key={`${r.college_code}-${r.course_code}-${i}`} r={r} />)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SuggestedOptionEntry({ grouped }) {
  const rows = []
  for (const conf of CONFIDENCE_LIST) {
    if (conf === 'Not Likely') continue // skip in option-entry suggestion
    for (const r of grouped[conf] || []) {
      rows.push({ ...r, _conf: conf })
    }
  }
  // Already sorted by probability within each bucket from API; keep order.
  const limited = rows.slice(0, 100)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested KCET Option-Entry Order</CardTitle>
        <CardDescription>
          KEA recommends Safe options first, then High Chance, then Borderline, then a few Low Chance picks at the bottom.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="min-w-[240px]">College</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Best Quota</TableHead>
                <TableHead className="text-right">Cutoff</TableHead>
                <TableHead className="text-right">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limited.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No recommendations.</TableCell></TableRow>}
              {limited.map((r, i) => (
                <TableRow key={`${r.college_code}-${r.course_code}-${i}`}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell><ConfidenceBadge confidence={r._conf} /></TableCell>
                  <TableCell>
                    <div className="font-medium">{r.college_name}</div>
                    <div className="text-xs text-muted-foreground"><span className="font-mono">{r.college_code}</span></div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.course_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.course_code}</div>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs">{r.bestQuota}</span></TableCell>
                  <TableCell className="text-right font-mono">{Number(r.bestCutoff).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{r.probability}%</TableCell>
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
  const baseCategory = sp.get('baseCategory') || sp.get('category') || 'GM'
  const rural = sp.get('rural') === '1'
  const kannada = sp.get('kannada') === '1'
  const special = (sp.get('special') || '').split(',').map((x) => x.trim()).filter(Boolean)
  const course = sp.get('course')
  const round = sp.get('round')

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
          body: JSON.stringify({ rank, baseCategory, rural, kannada, special, course, round }),
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
    if (rank && round) load()
    else { setError('Missing input. Please use the home page.'); setLoading(false) }
    return () => { cancelled = true }
  }, [rank, baseCategory, rural, kannada, special.join(','), course, round])

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Crunching cutoffs across all eligible quotas…</p>
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

  const results = data?.results || []
  const grouped = data?.grouped || {}
  const sectionB = data?.sectionB || []
  const meta = data?.meta || {}
  const eligibleCats = meta.eligibleCategories || []

  const profileLine = [
    baseCategory,
    rural && 'Rural',
    kannada && 'Kannada Medium',
    ...special,
  ].filter(Boolean).join(' · ')

  const premiumInput = { rank: Number(rank), baseCategory, rural, kannada, special, course, round }

  return (
    <div className="container py-8">
      {/* Summary bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your Predicted Colleges</h1>
          <p className="text-sm text-muted-foreground">
            Rank <span className="font-semibold text-foreground">{Number(rank).toLocaleString()}</span> ·
            Profile <span className="font-semibold text-foreground">{profileLine}</span> ·
            Round <span className="font-semibold text-foreground">{round}</span> ·
            Course <span className="font-semibold text-foreground">{course}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Evaluated under:</span>
            {eligibleCats.map((c, i) => (
              <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{c.code}</span>
            ))}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Multi-quota prediction generated successfully.
          </div>
        </div>
        <PremiumPdfButton input={premiumInput} />
      </div>

      <div className="mt-6">
        <EmbeddedNotice />
      </div>

      <div className="mt-6">
        <AdSlot label="Advertisement — Results Page Banner" />
      </div>

      {/* Confidence summary tiles */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CONFIDENCE_LIST.map((conf) => {
          const cfg = CONFIDENCE_COLORS[conf]
          const count = grouped[conf]?.length || 0
          return (
            <div key={conf} className="rounded-lg border bg-card p-3" style={{ borderTopWidth: 3, borderTopColor: cfg.hex }}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>{cfg.emoji}</span> {conf}
              </div>
            </div>
          )
        })}
      </div>

      <Tabs defaultValue="grouped" className="mt-8">
        <TabsList>
          <TabsTrigger value="grouped"><Layers className="mr-2 h-4 w-4" /> By Confidence ({results.length})</TabsTrigger>
          <TabsTrigger value="sectionB"><Sparkles className="mr-2 h-4 w-4" /> All Obtainable Branches ({sectionB.length})</TabsTrigger>
          <TabsTrigger value="optionOrder"><FileDown className="mr-2 h-4 w-4" /> Suggested Option Order</TabsTrigger>
        </TabsList>

        <TabsContent value="grouped" className="mt-4 space-y-4">
          {CONFIDENCE_LIST.map((conf) => (
            <GroupSection key={conf} confidence={conf} rows={grouped[conf] || []} />
          ))}
        </TabsContent>

        <TabsContent value="sectionB" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Colleges & All Obtainable Branches</CardTitle>
              <CardDescription>Every branch with a Borderline-or-better chance across all colleges (best quota shown).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[260px]">College</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Branches You Can Get</TableHead>
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
                            {c.courses.map((co) => {
                              const cfg = CONFIDENCE_COLORS[co.confidence] || CONFIDENCE_COLORS['Borderline']
                              return (
                                <span
                                  key={co.course_code}
                                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                                  style={{ borderColor: cfg.hex + '4D', backgroundColor: cfg.hex + '14', color: cfg.hex }}
                                  title={`${co.course_name} · cutoff ${co.closing_rank} · ${co.confidence}`}
                                >
                                  <span className="font-medium">{co.course_code}</span>
                                  <span className="opacity-70">· {co.closing_rank.toLocaleString()}</span>
                                  <span className="opacity-70">· {co.probability}%</span>
                                </span>
                              )
                            })}
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
          <SuggestedOptionEntry grouped={grouped} />
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
