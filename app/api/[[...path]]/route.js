import { NextResponse } from 'next/server'
import { getAdminClient, hasServiceRole } from '@/lib/supabaseAdmin'
import {
  SEED_COLLEGES,
  SEED_COURSES,
  CATEGORIES,
  ROUNDS,
  generateSeedCutoffs,
} from '@/lib/seedData'

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

// ----- prediction logic -----
function chanceFor(rank, cutoff) {
  if (rank <= cutoff * 0.85) return 'High'
  if (rank <= cutoff * 1.10) return 'Possible'
  return 'Dream'
}

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

  // Fetch colleges + courses to enrich
  const [collegesRes, coursesRes] = await Promise.all([
    client.from('colleges').select('college_code, college_name, tier, city'),
    client.from('courses').select('code, course_name'),
  ])
  if (collegesRes.error) return errorResponse(collegesRes.error.message, 500)
  if (coursesRes.error) return errorResponse(coursesRes.error.message, 500)

  const collegeMap = new Map(collegesRes.data.map((c) => [c.college_code, c]))
  const courseMap = new Map(coursesRes.data.map((c) => [c.code, c]))

  // Fetch cutoffs for category + round
  let cutoffQuery = client
    .from('cutoffs')
    .select('college_code, course_code, closing_rank, year, round, category')
    .eq('category', category)
    .eq('round', round)

  const { data: cutoffs, error: cutErr } = await cutoffQuery
  if (cutErr) return errorResponse(cutErr.message, 500)

  // Section A: selected course only, sorted by tier then by chance/cutoff
  let sectionA = []
  if (courseCode) {
    sectionA = cutoffs
      .filter((c) => c.course_code === courseCode)
      .map((c) => {
        const college = collegeMap.get(c.college_code) || {}
        const course = courseMap.get(c.course_code) || {}
        return {
          college_code: c.college_code,
          college_name: college.college_name || c.college_code,
          tier: college.tier || 'T?',
          city: college.city || '',
          course_code: c.course_code,
          course_name: course.course_name || c.course_code,
          closing_rank: Number(c.closing_rank),
          chance: chanceFor(rank, Number(c.closing_rank)),
        }
      })
      .filter((r) => r.chance !== 'Dream' || rank <= r.closing_rank * 1.8)
      .sort((a, b) => {
        const tierA = parseInt((a.tier || 'T9').replace(/\D/g, '')) || 9
        const tierB = parseInt((b.tier || 'T9').replace(/\D/g, '')) || 9
        if (tierA !== tierB) return tierA - tierB
        return a.closing_rank - b.closing_rank
      })
  }

  // Section B: aggregate ALL courses obtainable per college (High + Possible only)
  const collegeBuckets = new Map()
  for (const c of cutoffs) {
    const closing = Number(c.closing_rank)
    const chance = chanceFor(rank, closing)
    if (chance === 'Dream') continue
    const college = collegeMap.get(c.college_code)
    if (!college) continue
    if (!collegeBuckets.has(c.college_code)) {
      collegeBuckets.set(c.college_code, {
        college_code: c.college_code,
        college_name: college.college_name,
        tier: college.tier,
        city: college.city,
        courses: [],
      })
    }
    const course = courseMap.get(c.course_code)
    collegeBuckets.get(c.college_code).courses.push({
      course_code: c.course_code,
      course_name: course?.course_name || c.course_code,
      closing_rank: closing,
      chance,
    })
  }

  const sectionB = Array.from(collegeBuckets.values())
    .map((c) => {
      // dedupe courses and keep best chance/lowest rank per course
      const map = new Map()
      for (const co of c.courses) {
        const existing = map.get(co.course_code)
        if (!existing || co.closing_rank < existing.closing_rank) map.set(co.course_code, co)
      }
      c.courses = Array.from(map.values()).sort((a, b) => a.closing_rank - b.closing_rank)
      return c
    })
    .sort((a, b) => {
      const tierA = parseInt((a.tier || 'T9').replace(/\D/g, '')) || 9
      const tierB = parseInt((b.tier || 'T9').replace(/\D/g, '')) || 9
      if (tierA !== tierB) return tierA - tierB
      return b.courses.length - a.courses.length
    })

  return cors(NextResponse.json({
    ok: true,
    input: { rank, category, course: courseCode, round },
    counts: { sectionA: sectionA.length, sectionB: sectionB.length },
    sectionA,
    sectionB,
  }))
}

async function handleLookup() {
  const { client, error } = requireClient()
  if (error) return error

  const [coursesRes, cutoffsRes] = await Promise.all([
    client.from('courses').select('code, course_name').order('course_name'),
    client.from('cutoffs').select('category, round'),
  ])
  if (coursesRes.error) return errorResponse(coursesRes.error.message)
  const cats = new Set(CATEGORIES)
  const rnds = new Set(ROUNDS)
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
  const [c1, c2, c3, c4, c5] = await Promise.all([
    client.from('colleges').select('id', { count: 'exact', head: true }),
    client.from('courses').select('code', { count: 'exact', head: true }),
    client.from('cutoffs').select('id', { count: 'exact', head: true }),
    client.from('payments').select('id', { count: 'exact', head: true }),
    client.from('reports').select('id', { count: 'exact', head: true }),
  ])
  return cors(NextResponse.json({
    colleges: c1.count || 0,
    courses: c2.count || 0,
    cutoffs: c3.count || 0,
    payments: c4.count || 0,
    reports: c5.count || 0,
    has_service_role: hasServiceRole(),
  }))
}

async function handleList(request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 1000)
  const { client, error } = requireClient()
  if (error) return error

  if (type === 'colleges') {
    const { data, error } = await client.from('colleges').select('*').order('college_code').limit(limit)
    if (error) return errorResponse(error.message)
    return cors(NextResponse.json({ rows: data }))
  }
  if (type === 'courses') {
    const { data, error } = await client.from('courses').select('*').order('code').limit(limit)
    if (error) return errorResponse(error.message)
    return cors(NextResponse.json({ rows: data }))
  }
  if (type === 'cutoffs') {
    const { data, error } = await client
      .from('cutoffs')
      .select('*')
      .order('closing_rank', { ascending: true })
      .limit(limit)
    if (error) return errorResponse(error.message)
    return cors(NextResponse.json({ rows: data }))
  }
  if (type === 'payments') {
    const { data, error } = await client.from('payments').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) return errorResponse(error.message)
    return cors(NextResponse.json({ rows: data }))
  }
  if (type === 'reports') {
    const { data, error } = await client.from('reports').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) return errorResponse(error.message)
    return cors(NextResponse.json({ rows: data }))
  }
  return errorResponse('Unknown type', 400)
}

async function handleUploadCsv(request) {
  if (!hasServiceRole()) {
    return errorResponse(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Bulk uploads require the service role key.',
      503
    )
  }
  const body = await request.json().catch(() => ({}))
  const type = String(body.type || '')
  const rows = Array.isArray(body.rows) ? body.rows : []
  if (!rows.length) return errorResponse('No rows provided', 400)

  const { client, error } = requireClient()
  if (error) return error

  const cleanInt = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  let table = null
  let conflictTarget = null
  let mapped = []
  if (type === 'colleges') {
    table = 'colleges'
    conflictTarget = 'college_code'
    mapped = rows.map((r) => ({
      college_code: String(r.college_code || r.code || '').trim(),
      college_name: String(r.college_name || r.name || '').trim(),
      tier: String(r.tier || '').trim(),
      city: String(r.city || '').trim(),
    })).filter((r) => r.college_code && r.college_name)
  } else if (type === 'courses') {
    table = 'courses'
    conflictTarget = 'code'
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

  // batch in chunks of 500
  const chunk = 500
  let inserted = 0
  for (let i = 0; i < mapped.length; i += chunk) {
    const slice = mapped.slice(i, i + chunk)
    let q = client.from(table)
    let res
    if (conflictTarget) {
      res = await q.upsert(slice, { onConflict: conflictTarget })
    } else {
      res = await q.insert(slice)
    }
    if (res.error) return errorResponse(res.error.message, 500, { inserted })
    inserted += slice.length
  }
  return cors(NextResponse.json({ ok: true, inserted, type }))
}

async function handleSeed() {
  if (!hasServiceRole()) {
    return errorResponse(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Seeding requires the service role key.',
      503
    )
  }
  const { client, error } = requireClient()
  if (error) return error

  // colleges
  const cRes = await client.from('colleges').upsert(SEED_COLLEGES, { onConflict: 'college_code' })
  if (cRes.error) return errorResponse('colleges: ' + cRes.error.message)

  // courses
  const coRes = await client.from('courses').upsert(SEED_COURSES, { onConflict: 'code' })
  if (coRes.error) return errorResponse('courses: ' + coRes.error.message)

  // cutoffs
  const cutoffs = generateSeedCutoffs(2024)
  // clear existing demo cutoffs for the seed colleges/year? Easier: just insert.
  const chunk = 1000
  for (let i = 0; i < cutoffs.length; i += chunk) {
    const slice = cutoffs.slice(i, i + chunk)
    const res = await client.from('cutoffs').insert(slice)
    if (res.error) return errorResponse('cutoffs: ' + res.error.message)
  }
  return cors(NextResponse.json({
    ok: true,
    inserted: {
      colleges: SEED_COLLEGES.length,
      courses: SEED_COURSES.length,
      cutoffs: cutoffs.length,
    }
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
  // Delete-all: use neq trick
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

async function handleRoute(request, { params }) {
  const resolvedParams = await Promise.resolve(params)
  const path = resolvedParams?.path || []
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if (route === '/' && method === 'GET') {
      return cors(NextResponse.json({ message: 'KCET College Predictor API', ok: true }))
    }
    if (route === '/health' && method === 'GET') {
      return cors(NextResponse.json({ ok: true, has_service_role: hasServiceRole() }))
    }
    if (route === '/lookup' && method === 'GET') return handleLookup()
    if (route === '/predict' && method === 'POST') return handlePredict(request)
    if (route === '/admin/stats' && method === 'GET') return handleStats()
    if (route === '/admin/list' && method === 'GET') return handleList(request)
    if (route === '/admin/upload-csv' && method === 'POST') return handleUploadCsv(request)
    if (route === '/admin/seed' && method === 'POST') return handleSeed()
    if (route === '/admin/clear' && method === 'DELETE') return handleClear(request)
    if (route === '/admin/delete' && method === 'POST') return handleDelete(request)
    if (route === '/admin/upsert' && method === 'POST') return handleUpsert(request)

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
