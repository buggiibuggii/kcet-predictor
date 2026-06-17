'use client'

import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import CsvImporter from '@/components/CsvImporter'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Database, FileUp, RefreshCw, Sparkles, Trash2, Upload, AlertTriangle, IndianRupee, CreditCard, FileText, ExternalLink, User as UserIcon, LogOut } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { useRouter } from 'next/navigation'

function StatCard({ label, value, hint }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value?.toLocaleString?.() ?? value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="pt-0"><p className="text-xs text-muted-foreground">{hint}</p></CardContent>}
    </Card>
  )
}

function CsvUploader({ type, sample, onDone }) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows.length) {
          toast.error('CSV is empty')
          return
        }
        setPreview({ headers: Object.keys(rows[0] || {}), count: rows.length, rows: rows.slice(0, 5) })
        try {
          setBusy(true)
          const res = await fetch('/api/admin/upload-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, rows }),
          })
          const j = await res.json()
          if (!res.ok) throw new Error(j.error || 'Upload failed')
          toast.success(`Uploaded ${j.inserted} rows to ${type}`)
          onDone?.()
        } catch (err) {
          toast.error(err.message)
        } finally {
          setBusy(false)
          e.target.value = ''
        }
      },
      error: (err) => toast.error('CSV parse error: ' + err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 capitalize"><FileUp className="h-5 w-5 text-primary" /> {type} CSV</CardTitle>
        <CardDescription>
          Expected headers: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{sample}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor={`csv-${type}`} className="sr-only">CSV file</Label>
        <Input id={`csv-${type}`} type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
        {busy && <p className="mt-2 text-sm text-muted-foreground">Uploading…</p>}
        {preview && (
          <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs">
            <div className="mb-1 font-medium">Detected {preview.count} rows · headers:</div>
            <div className="font-mono">{preview.headers.join(', ')}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DataTable({ type, refreshKey, columns }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/list?type=${type}&limit=200`)
      const j = await res.json()
      setRows(j.rows || [])
    } catch (e) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [type, refreshKey]) // eslint-disable-line

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="capitalize">{type}</CardTitle>
          <CardDescription>Showing up to 200 rows.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">No data yet.</TableCell></TableRow>}
              {!loading && rows.map((r, i) => (
                <TableRow key={r.id ?? r.college_code ?? r.code ?? i}>
                  {columns.map((c) => (
                    <TableCell key={c} className="max-w-[300px] truncate font-mono text-xs">
                      {String(r[c] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentsTable({ refreshKey }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/list?type=payments&limit=200')
        const j = await res.json()
        if (!cancelled) setRows(j.rows || [])
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>All Razorpay payment attempts and captures.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No payments yet.</TableCell></TableRow>}
              {!loading && rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.payment_id}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={
                      (r.status || '').toLowerCase() === 'captured'
                        ? 'bg-emerald-500 hover:bg-emerald-500'
                        : (r.status || '').toLowerCase() === 'failed'
                          ? 'bg-red-500 hover:bg-red-500'
                          : 'bg-slate-500 hover:bg-slate-500'
                    }>{r.status || 'unknown'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportsTable({ refreshKey }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/list?type=reports&limit=200')
        const j = await res.json()
        if (!cancelled) setRows(j.rows || [])
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Reports</CardTitle>
        <CardDescription>Premium PDFs stored in Supabase bucket “reports”.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No reports generated yet.</TableCell></TableRow>}
              {!loading && rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="font-mono">{r.rank}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="font-mono text-xs">{r.course_code || '—'}</TableCell>
                  <TableCell>
                    {r.pdf_url ? (
                      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">No URL</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function RevenuePanel({ refreshKey }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/revenue')
        const j = await res.json()
        if (!cancelled) setData(j)
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Total Revenue</CardDescription>
          <CardTitle className="text-3xl">₹{(data?.total_revenue ?? 0).toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Captured Payments</CardDescription>
          <CardTitle className="text-3xl">{data?.total_captured ?? 0}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Failed Attempts</CardDescription>
          <CardTitle className="text-3xl">{data?.total_failed ?? 0}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

function App() {
  const [stats, setStats] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [seeding, setSeeding] = useState(false)
  const [user, setUser] = useState(null)
  const [whitelistOn, setWhitelistOn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const sb = getBrowserSupabase()
    if (!sb) return
    sb.auth.getUser().then(({ data }) => setUser(data.user || null))
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats')
      const j = await res.json()
      setStats(j)
      // Check whitelist from a safer route
      const res2 = await fetch('/api/admin/whoami')
      if (res2.ok) { const j2 = await res2.json(); setWhitelistOn(!!j2.whitelist_on) }
    } catch (e) { /* ignore */ }
  }
  useEffect(() => { loadStats() }, [refreshKey])

  async function signOut() {
    const sb = getBrowserSupabase()
    if (!sb) return
    await sb.auth.signOut()
    router.push('/login')
  }

  async function seedDemo() {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Seed failed')
      toast.success(`Seeded ${j.inserted.colleges} colleges, ${j.inserted.courses} courses, ${j.inserted.cutoffs} cutoffs`)
      setRefreshKey((x) => x + 1)
    } catch (e) {
      toast.error(e.message)
    } finally { setSeeding(false) }
  }

  async function clearTable(type) {
    if (!confirm(`Delete ALL rows from ${type}?`)) return
    try {
      const res = await fetch(`/api/admin/clear?type=${type}`, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      toast.success(`Cleared ${type}`)
      setRefreshKey((x) => x + 1)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Upload KEA cutoff CSVs, seed demo data, manage records.</p>
            {user && (
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> Signed in as <span className="font-mono">{user.email}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRefreshKey((x) => x + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={seedDemo} disabled={seeding}>
              <Sparkles className="mr-2 h-4 w-4" /> {seeding ? 'Seeding…' : 'Seed Demo Data'}
            </Button>
            {user && (
              <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
            )}
          </div>
        </div>

        {!whitelistOn && (
          <Card className="mt-4 border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="text-sm">
                <div className="font-semibold">Admin whitelist not set</div>
                <div className="text-muted-foreground">
                  Any signed-in user can currently access this dashboard. For production, set <code className="font-mono">ADMIN_EMAILS</code> (comma-separated emails) in your environment.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.has_service_role === false && (
          <Card className="mt-4 border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="text-sm">
                <div className="font-semibold">Service role key missing</div>
                <div className="text-muted-foreground">
                  Add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in your environment (Emergent secrets).
                  Bulk uploads & seeding require the service role.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Colleges" value={stats.colleges ?? '—'} />
          <StatCard label="Courses" value={stats.courses ?? '—'} />
          <StatCard label="Cutoff rows" value={stats.cutoffs ?? '—'} />
          <StatCard label="Payments" value={stats.payments ?? '—'} />
          <StatCard label="Reports" value={stats.reports ?? '—'} />
        </div>

        <Tabs defaultValue="upload" className="mt-8">
          <TabsList>
            <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4" /> CSV Upload</TabsTrigger>
            <TabsTrigger value="data"><Database className="mr-2 h-4 w-4" /> Data</TabsTrigger>
            <TabsTrigger value="revenue"><IndianRupee className="mr-2 h-4 w-4" /> Revenue</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" /> Payments</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="mr-2 h-4 w-4" /> Reports</TabsTrigger>
            <TabsTrigger value="manage"><Trash2 className="mr-2 h-4 w-4" /> Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <CsvImporter type="colleges" onDone={() => setRefreshKey((x) => x + 1)} />
              <CsvImporter type="courses" onDone={() => setRefreshKey((x) => x + 1)} />
              <CsvImporter type="cutoffs" onDone={() => setRefreshKey((x) => x + 1)} />
            </div>
            <Card className="mt-4 border-amber-500/40 bg-amber-500/5">
              <CardContent className="py-3 text-xs text-muted-foreground">
                <b>Tip:</b> For cutoffs, only <code className="font-mono">year, round, category, college_code, course_code, closing_rank</code> are required.
                Colleges & courses you reference are auto-created. New years (2026, 2027 …) appear in the predictor dropdowns automatically.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-4 space-y-4">
            <DataTable type="colleges" refreshKey={refreshKey} columns={['college_code', 'college_name', 'tier', 'city']} />
            <DataTable type="courses" refreshKey={refreshKey} columns={['code', 'course_name']} />
            <DataTable type="cutoffs" refreshKey={refreshKey} columns={['year', 'round', 'category', 'college_code', 'course_code', 'closing_rank']} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 space-y-4">
            <RevenuePanel refreshKey={refreshKey} />
            <PaymentsTable refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentsTable refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ReportsTable refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>Wipe a table completely. This cannot be undone.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="destructive" onClick={() => clearTable('cutoffs')}>Clear cutoffs</Button>
                <Button variant="destructive" onClick={() => clearTable('colleges')}>Clear colleges</Button>
                <Button variant="destructive" onClick={() => clearTable('courses')}>Clear courses</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}

export default App
