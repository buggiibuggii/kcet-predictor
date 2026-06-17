'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { FileUp, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'

const CHUNK_ROWS_CUTOFFS = 2000
const CHUNK_ROWS_OTHER = 1000

const SAMPLE_HEADERS = {
  colleges: 'college_code, college_name, tier, city',
  courses: 'code, course_name',
  cutoffs: 'year, round, category, college_code, course_code, closing_rank',
}

export default function CsvImporter({ type, onDone }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(type === 'cutoffs' ? 'append' : 'append')
  const [progress, setProgress] = useState(0) // 0..100
  const [totalRows, setTotalRows] = useState(0)
  const [doneRows, setDoneRows] = useState(0)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [previewHeaders, setPreviewHeaders] = useState(null)
  const cancelRef = useRef(false)

  async function pickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReport(null); setError(null); setProgress(0); setDoneRows(0); cancelRef.current = false
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
        if (!rows.length) { toast.error('CSV is empty'); return }
        setPreviewHeaders({ headers: Object.keys(rows[0] || {}), count: rows.length })
        await uploadInChunks(rows)
        if (fileRef.current) fileRef.current.value = ''
      },
      error: (err) => { setError('CSV parse error: ' + err.message); toast.error(err.message) },
    })
  }

  async function uploadInChunks(rows) {
    setBusy(true)
    setTotalRows(rows.length)
    const chunkSize = type === 'cutoffs' ? CHUNK_ROWS_CUTOFFS : CHUNK_ROWS_OTHER
    const summary = {
      inserted: 0, invalid: 0, duplicates_in_chunk: 0,
      auto_created_colleges: 0, auto_created_courses: 0,
      chunks: 0, failed_chunks: 0,
    }
    try {
      const total = rows.length
      for (let i = 0, c = 0; i < total; i += chunkSize, c++) {
        if (cancelRef.current) break
        const slice = rows.slice(i, i + chunkSize)
        const isFirst = i === 0
        const isLast = i + slice.length >= total
        const res = await fetch('/api/admin/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, rows: slice, mode, first_chunk: isFirst, last_chunk: isLast }),
        })
        const j = await res.json()
        summary.chunks++
        if (!res.ok) {
          summary.failed_chunks++
          // soft-fail: keep going if possible
          summary.inserted += Number(j.inserted) || 0
          setError(`Chunk ${c + 1}: ${j.error || 'failed'}`)
          break
        }
        summary.inserted += Number(j.inserted) || 0
        summary.invalid += Number(j.invalid) || 0
        summary.duplicates_in_chunk += Number(j.duplicates_in_chunk) || 0
        summary.auto_created_colleges += Number(j.auto_created_colleges) || 0
        summary.auto_created_courses += Number(j.auto_created_courses) || 0
        const processed = Math.min(i + slice.length, total)
        setDoneRows(processed)
        setProgress(Math.round((processed / total) * 100))
      }
      setReport(summary)
      const finalMsg = `Imported ${summary.inserted.toLocaleString()} rows`
      if (summary.failed_chunks === 0) toast.success(finalMsg)
      else toast.warning(`${finalMsg} (with ${summary.failed_chunks} failed chunk${summary.failed_chunks === 1 ? '' : 's'})`)
      onDone?.()
    } catch (e) {
      setError(e.message); toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  function cancel() { cancelRef.current = true; setBusy(false) }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 capitalize"><FileUp className="h-5 w-5 text-primary" /> {type} CSV</CardTitle>
        <CardDescription>
          Expected headers: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{SAMPLE_HEADERS[type]}</code>
          {type === 'cutoffs' && (
            <span className="block mt-1">
              Colleges & courses are auto-created from this file. Large files are uploaded in chunks of {CHUNK_ROWS_CUTOFFS.toLocaleString()} rows.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === 'cutoffs' && (
          <div>
            <Label className="text-xs">Import mode</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 hover:bg-muted/50">
                <RadioGroupItem value="append" id={`m-app-${type}`} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Append</div>
                  <div className="text-xs text-muted-foreground">Add to existing cutoffs.</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 hover:bg-muted/50">
                <RadioGroupItem value="replace" id={`m-rep-${type}`} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Replace existing data</div>
                  <div className="text-xs text-muted-foreground">Wipe all cutoffs first, then import (recommended for clean re-imports).</div>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        <div>
          <Label htmlFor={`csv-${type}`} className="sr-only">CSV file</Label>
          <Input ref={fileRef} id={`csv-${type}`} type="file" accept=".csv,text/csv" onChange={pickFile} disabled={busy} />
        </div>

        {previewHeaders && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="mb-1 font-medium">{previewHeaders.count.toLocaleString()} rows detected · headers:</div>
            <div className="font-mono">{previewHeaders.headers.join(', ')}</div>
          </div>
        )}

        {busy && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {doneRows.toLocaleString()} / {totalRows.toLocaleString()} rows</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <Button variant="outline" size="sm" onClick={cancel} className="gap-1"><X className="h-3.5 w-3.5" /> Cancel</Button>
          </div>
        )}

        {report && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
            <div className="mb-2 inline-flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Import complete
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <div><span className="text-muted-foreground">Rows inserted:</span> <b>{report.inserted.toLocaleString()}</b></div>
              <div><span className="text-muted-foreground">Invalid rows:</span> <b>{report.invalid.toLocaleString()}</b></div>
              <div><span className="text-muted-foreground">Duplicates dropped:</span> <b>{report.duplicates_in_chunk.toLocaleString()}</b></div>
              {type === 'cutoffs' && <div><span className="text-muted-foreground">Auto-created colleges:</span> <b>{report.auto_created_colleges.toLocaleString()}</b></div>}
              {type === 'cutoffs' && <div><span className="text-muted-foreground">Auto-created courses:</span> <b>{report.auto_created_courses.toLocaleString()}</b></div>}
              <div><span className="text-muted-foreground">Chunks processed:</span> <b>{report.chunks}</b></div>
              {report.failed_chunks > 0 && <div className="text-red-600"><span className="text-muted-foreground">Failed chunks:</span> <b>{report.failed_chunks}</b></div>}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
            <div className="inline-flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Error</div>
            <pre className="mt-1 whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
