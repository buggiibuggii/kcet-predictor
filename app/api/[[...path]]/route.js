import { NextResponse } from 'next/server'
import { getAdminClient, hasServiceRole } from '@/lib/supabaseAdmin'
import { SEED_COLLEGES, SEED_COURSES, generateSeedCutoffs, ROUNDS as DEFAULT_ROUNDS } from '@/lib/seedData'
import { runPrediction } from '@/lib/predictor'
import { ALL_CATEGORIES } from '@/lib/categories'
import { getRazorpay, hasRazorpay, verifyRazorpaySignature } from '@/lib/razorpay'
import { generateReportPdf } from '@/lib/pdfGenerator.jsx'
import { getCurrentUser, isAdminEmail, adminWhitelistConfigured } from '@/lib/supabaseServer'

const REPORT_PRICE_PAISE = 50 * 100 // ₹50
const REPORTS_BUCKET = 'reports'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

function errorResponse(message, status = 500, extra = {}) {
  return cors(NextResponse.json({ error: message, ...extra }, { status }))
}

function requireClient() {
  const client = getAdminClient()
  if (!client) {
    return {
      error: errorResponse(
        'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY for admin actions) to your environment.',
        503
      ),
    }
  }
  return { client }
}

// ----- /api/predict -----
async function handlePredict(request) {
  const body = await request.json().catch(() => ({}))
  const rank = Number(body.rank)
  const category = String(body.category || '').trim()
  const courseCode = String(body.course || '').trim()
  const round = String(body.round || '').trim()

  if (!rank || rank <= 0) return errorResponse('Invalid rank', 400)
  if (!category) return errorResponse('Category is required', 400)
  if (!round) return errorResponse('Round is required', 400)

  const { client, error } = requireClient()
  if (error) return error
  try {
    const { sectionA, sectionB } = await runPrediction(client, { rank, category, course: courseCode, round, includeFullSectionA: false })
    return cors(NextResponse.json({
      ok: true,
      input: { rank, category, course: courseCode, round },
      counts: { sectionA: sectionA.length, sectionB: sectionB.length },
      sectionA,
      sectionB,
    }))
  } catch (e) {
    return errorResponse(e?.message || 'Prediction failed', 500)
  }
}

async function handleLookup() {
  const { client, error } = requireClient()
  if (error) return error
  const [coursesRes, cutoffsRes] = await Promise.all([
    client.from('courses').select('code, course_name').order('course_name'),
    client.from('cutoffs').select('category, round'),
  ])
  if (coursesRes.error) return errorResponse(coursesRes.error.message)
  const cats = new Set(ALL_CATEGORIES)
  const rnds = new Set(DEFAULT_ROUNDS)
  if (!cutoffsRes.error && cutoffsRes.data) {
    for (const c of cutoffsRes.data) {
      if (c.category) cats.add(c.category)
      if (c.round) rnds.add(c.round)
    }
  }
  return cors(NextResponse.json({
    courses: coursesRes.data || [],
    categories: Array.from(cats),
    rounds: Array.from(rnds),
  }))
}

async function handleStats() {
  const { client, error } = requireClient()
  if (error) return error
  const [c1, c2, c3, c4, c5, p] = await Promise.all([
    client.from('colleges').select('id', { count: 'exact', head: true }),
    client.from('courses').select('code', { count: 'exact', head: true }),
    client.from('cutoffs').select('id', { count: 'exact', head: true }),
    client.from('payments').select('id', { count: 'exact', head: true }),
    client.from('reports').select('id', { count: 'exact', head: true }),
    client.from('payments').select('amount, status'),
  ])
  let revenue = 0
  if (!p.error && p.data) {
    for (const r of p.data) {
      if ((r.status || '').toLowerCase() === 'captured') revenue += Number(r.amount) || 0
    }
  }
  return cors(NextResponse.json({
    colleges: c1.count || 0,
    courses: c2.count || 0,
    cutoffs: c3.count || 0,
    payments: c4.count || 0,
    reports: c5.count || 0,
    revenue, // in INR
    has_service_role: hasServiceRole(),
    has_razorpay: hasRazorpay(),
  }))
}

async function handleList(request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 1000)
  const { client, error } = requireClient()
  if (error) return error

  const queries = {
    colleges: () => client.from('colleges').select('*').order('college_code').limit(limit),
    courses: () => client.from('courses').select('*').order('code').limit(limit),
    cutoffs: () => client.from('cutoffs').select('*').order('closing_rank').limit(limit),
    payments: () => client.from('payments').select('*').order('created_at', { ascending: false }).limit(limit),
    reports: () => client.from('reports').select('*').order('created_at', { ascending: false }).limit(limit),
  }
  if (!queries[type]) return errorResponse('Unknown type', 400)
  const { data, error: err } = await queries[type]()
  if (err) return errorResponse(err.message)
  return cors(NextResponse.json({ rows: data }))
}

async function handleUploadCsv(request) {
  if (!hasServiceRole()) {
    return errorResponse('SUPABASE_SERVICE_ROLE_KEY is not configured.', 503)
  }
  const body = await request.json().catch(() => ({}))
  const type = String(body.type || '')
  const rows = Array.isArray(body.rows) ? body.rows : []
  if (!rows.length) return errorResponse('No rows provided', 400)
  const { client, error } = requireClient()
  if (error) return error

  const cleanInt = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v); return Number.isFinite(n) ? n : null
  }
  let table = null, conflictTarget = null, mapped = []
  if (type === 'colleges') {
    table = 'colleges'; conflictTarget = 'college_code'
    mapped = rows.map((r) => ({
      college_code: String(r.college_code || r.code || '').trim(),
      college_name: String(r.college_name || r.name || '').trim(),
      tier: String(r.tier || '').trim(),
      city: String(r.city || '').trim(),
    })).filter((r) => r.college_code && r.college_name)
  } else if (type === 'courses') {
    table = 'courses'; conflictTarget = 'code'
    mapped = rows.map((r) => ({
      code: String(r.code || r.course_code || '').trim(),
      course_name: String(r.course_name || r.name || '').trim(),
    })).filter((r) => r.code && r.course_name)
  } else if (type === 'cutoffs') {
    table = 'cutoffs'
    mapped = rows.map((r) => ({
      year: cleanInt(r.year) || new Date().getFullYear(),
      round: String(r.round || '').trim(),
      category: String(r.category || '').trim(),
      college_code: String(r.college_code || '').trim(),
      course_code: String(r.course_code || '').trim(),
      closing_rank: cleanInt(r.closing_rank),
    })).filter((r) => r.round && r.category && r.college_code && r.course_code && r.closing_rank != null)
  } else {
    return errorResponse('Unknown type', 400)
  }
  if (!mapped.length) return errorResponse('No valid rows after cleaning', 400)

  const chunk = 500
  let inserted = 0
  for (let i = 0; i < mapped.length; i += chunk) {
    const slice = mapped.slice(i, i + chunk)
    const res = conflictTarget
      ? await client.from(table).upsert(slice, { onConflict: conflictTarget })
      : await client.from(table).insert(slice)
    if (res.error) return errorResponse(res.error.message, 500, { inserted })
    inserted += slice.length
  }
  return cors(NextResponse.json({ ok: true, inserted, type }))
}

async function handleSeed() {
  if (!hasServiceRole()) return errorResponse('Service role required', 503)
  const { client, error } = requireClient()
  if (error) return error

  const cRes = await client.from('colleges').upsert(SEED_COLLEGES, { onConflict: 'college_code' })
  if (cRes.error) return errorResponse('colleges: ' + cRes.error.message)
  const coRes = await client.from('courses').upsert(SEED_COURSES, { onConflict: 'code' })
  if (coRes.error) return errorResponse('courses: ' + coRes.error.message)
  const cutoffs = generateSeedCutoffs(2024)
  const chunk = 1000
  for (let i = 0; i < cutoffs.length; i += chunk) {
    const slice = cutoffs.slice(i, i + chunk)
    const res = await client.from('cutoffs').insert(slice)
    if (res.error) return errorResponse('cutoffs: ' + res.error.message)
  }
  return cors(NextResponse.json({
    ok: true,
    inserted: { colleges: SEED_COLLEGES.length, courses: SEED_COURSES.length, cutoffs: cutoffs.length }
  }))
}

async function handleClear(request) {
  if (!hasServiceRole()) return errorResponse('Service role required', 503)
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const { client, error } = requireClient()
  if (error) return error
  if (!['colleges', 'courses', 'cutoffs'].includes(type)) return errorResponse('Bad type', 400)
  const idCol = type === 'courses' ? 'code' : (type === 'colleges' ? 'college_code' : 'id')
  const filterVal = type === 'cutoffs' ? -1 : ''
  const res = await client.from(type).delete().neq(idCol, filterVal)
  if (res.error) return errorResponse(res.error.message)
  return cors(NextResponse.json({ ok: true, cleared: type }))
}

async function handleDelete(request) {
  if (!hasServiceRole()) return errorResponse('Service role required', 503)
  const body = await request.json().catch(() => ({}))
  const { type, key, value } = body
  const { client, error } = requireClient()
  if (error) return error
  if (!type || !key || value === undefined) return errorResponse('type/key/value required', 400)
  const res = await client.from(type).delete().eq(key, value)
  if (res.error) return errorResponse(res.error.message)
  return cors(NextResponse.json({ ok: true }))
}

async function handleUpsert(request) {
  if (!hasServiceRole()) return errorResponse('Service role required', 503)
  const body = await request.json().catch(() => ({}))
  const { type, row, conflict } = body
  const { client, error } = requireClient()
  if (error) return error
  if (!type || !row) return errorResponse('type/row required', 400)
  const res = conflict
    ? await client.from(type).upsert(row, { onConflict: conflict })
    : await client.from(type).insert(row)
  if (res.error) return errorResponse(res.error.message)
  return cors(NextResponse.json({ ok: true }))
}

// ----- /api/payment/create-order -----
async function handleCreateOrder(request) {
  if (!hasRazorpay()) return errorResponse('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment.', 503)
  const body = await request.json().catch(() => ({}))
  const rank = Number(body.rank)
  const category = String(body.category || '').trim()
  const course = String(body.course || '').trim()
  const round = String(body.round || '').trim()
  if (!rank || !category || !round) return errorResponse('rank, category, round are required', 400)

  const rzp = getRazorpay()
  try {
    const order = await rzp.orders.create({
      amount: REPORT_PRICE_PAISE,
      currency: 'INR',
      receipt: `kcet_${Date.now()}`,
      notes: { rank: String(rank), category, course, round, purpose: 'KCET Premium Report' },
    })
    return cors(NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      receipt: order.receipt,
    }))
  } catch (e) {
    console.error('Razorpay order creation failed', e)
    return errorResponse(e?.error?.description || e?.message || 'Order creation failed', 500)
  }
}

// ----- /api/payment/verify -----
async function handleVerifyPayment(request) {
  if (!hasRazorpay()) return errorResponse('Razorpay not configured', 503)
  const body = await request.json().catch(() => ({}))
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, input } = body || {}
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !input)
    return errorResponse('Missing required fields', 400)

  const ok = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })
  if (!ok) return errorResponse('Signature verification failed', 400)

  const rank = Number(input.rank)
  const category = String(input.category || '').trim()
  const course = String(input.course || '').trim()
  const round = String(input.round || '').trim()
  if (!rank || !category || !round) return errorResponse('Invalid input metadata', 400)

  const { client, error } = requireClient()
  if (error) return error

  try {
    // Run full prediction (includeFullSectionA=true so we capture Dream too)
    const { sectionA, sectionB } = await runPrediction(client, { rank, category, course, round, includeFullSectionA: true })

    // Lookup the course name for the cover page
    let courseName = course
    if (course) {
      const { data: cr } = await client.from('courses').select('course_name').eq('code', course).maybeSingle()
      if (cr?.course_name) courseName = cr.course_name
    }

    // Generate PDF
    const pdfBuffer = await generateReportPdf({
      input: { rank, category, course, round, course_name: courseName },
      sectionA,
      sectionB,
    })

    // Upload to Supabase Storage
    const ts = Date.now()
    const path = `reports/kcet_${rank}_${category}_${course || 'all'}_${round}_${ts}.pdf`
    const { error: upErr } = await client.storage
      .from(REPORTS_BUCKET)
      .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (upErr) {
      console.error('Storage upload error', upErr)
      // still try to record the payment as failed-storage
      await client.from('payments').insert({
        payment_id: razorpay_payment_id,
        amount: REPORT_PRICE_PAISE / 100,
        status: 'captured_no_pdf',
      })
      return errorResponse('PDF upload failed: ' + upErr.message, 500)
    }
    const { data: pub } = client.storage.from(REPORTS_BUCKET).getPublicUrl(path)
    const pdfUrl = pub?.publicUrl || null

    // Insert payment record
    const { error: payErr } = await client.from('payments').insert({
      payment_id: razorpay_payment_id,
      amount: REPORT_PRICE_PAISE / 100,
      status: 'captured',
    })
    if (payErr) console.error('Payment insert error', payErr)

    // Insert report record
    const { data: rep, error: repErr } = await client.from('reports').insert({
      rank,
      category,
      course_code: course || null,
      pdf_url: pdfUrl,
    }).select().single()
    if (repErr) console.error('Report insert error', repErr)

    return cors(NextResponse.json({
      ok: true,
      pdfUrl,
      reportId: rep?.id ?? null,
      paymentId: razorpay_payment_id,
    }))
  } catch (e) {
    console.error('verify-payment error', e)
    return errorResponse(e?.message || 'Verification flow failed', 500)
  }
}

// ----- /api/payment/record-failure -----
async function handleRecordFailure(request) {
  const body = await request.json().catch(() => ({}))
  const { razorpay_payment_id, description } = body || {}
  const { client, error } = requireClient()
  if (error) return error
  await client.from('payments').insert({
    payment_id: razorpay_payment_id || `failed_${Date.now()}`,
    amount: REPORT_PRICE_PAISE / 100,
    status: 'failed',
  })
  return cors(NextResponse.json({ ok: true }))
}

// ----- /api/admin/revenue -----
async function handleRevenue() {
  const { client, error } = requireClient()
  if (error) return error
  const { data, error: err } = await client
    .from('payments')
    .select('id, payment_id, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (err) return errorResponse(err.message)
  const rows = data || []
  const captured = rows.filter((r) => (r.status || '').toLowerCase() === 'captured')
  const totalRevenue = captured.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  // group by day
  const byDay = new Map()
  for (const r of captured) {
    const d = new Date(r.created_at)
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) || 0) + (Number(r.amount) || 0))
  }
  const trend = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }))
  return cors(NextResponse.json({
    total_revenue: totalRevenue,
    total_captured: captured.length,
    total_failed: rows.length - captured.length,
    trend,
    recent: rows.slice(0, 50),
  }))
}

// ----- /api/contact -----
async function handleContact(request) {
  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 120)
  const email = String(body.email || '').trim().slice(0, 200)
  const message = String(body.message || '').trim().slice(0, 4000)
  if (!name || !email || !message) return errorResponse('name, email, message required', 400)
  const { client, error } = requireClient()
  if (error) return error
  const { error: insErr } = await client.from('contacts').insert({ name, email, message })
  if (insErr) {
    // Most likely the table doesn't exist
    const setup = 'CREATE TABLE IF NOT EXISTS contacts (\n  id BIGSERIAL PRIMARY KEY,\n  name TEXT,\n  email TEXT,\n  message TEXT,\n  created_at TIMESTAMP DEFAULT NOW()\n);'
    console.warn('contacts insert failed', insErr.message)
    return cors(NextResponse.json({ ok: true, stored: false, setup_hint: `Create the contacts table in Supabase:\n${setup}` }))
  }
  return cors(NextResponse.json({ ok: true, stored: true }))
}

async function handleRoute(request, { params }) {
  const resolvedParams = await Promise.resolve(params)
  const path = resolvedParams?.path || []
  const route = `/${path.join('/')}`
  const method = request.method
  try {
    if (route === '/' && method === 'GET') return cors(NextResponse.json({ message: 'KCET College Predictor API', ok: true }))
    if (route === '/health' && method === 'GET') return cors(NextResponse.json({ ok: true, has_service_role: hasServiceRole(), has_razorpay: hasRazorpay() }))
    if (route === '/lookup' && method === 'GET') return handleLookup()
    if (route === '/predict' && method === 'POST') return handlePredict(request)
    if (route === '/admin/stats' && method === 'GET') return handleStats()
    if (route === '/admin/list' && method === 'GET') return handleList(request)
    if (route === '/admin/upload-csv' && method === 'POST') return handleUploadCsv(request)
    if (route === '/admin/seed' && method === 'POST') return handleSeed()
    if (route === '/admin/clear' && method === 'DELETE') return handleClear(request)
    if (route === '/admin/delete' && method === 'POST') return handleDelete(request)
    if (route === '/admin/upsert' && method === 'POST') return handleUpsert(request)
    if (route === '/admin/revenue' && method === 'GET') return handleRevenue()
    if (route === '/admin/whoami' && method === 'GET') {
      const u = await getCurrentUser()
      return cors(NextResponse.json({
        email: u?.email || null,
        whitelist_on: adminWhitelistConfigured(),
        is_admin: u ? isAdminEmail(u.email) : false,
      }))
    }
    if (route === '/payment/create-order' && method === 'POST') return handleCreateOrder(request)
    if (route === '/payment/verify' && method === 'POST') return handleVerifyPayment(request)
    if (route === '/payment/record-failure' && method === 'POST') return handleRecordFailure(request)
    if (route === '/contact' && method === 'POST') return handleContact(request)
    return errorResponse(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API error', e)
    return errorResponse(e?.message || 'Internal server error', 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
