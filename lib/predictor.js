// Shared prediction logic used by both /api/predict (filtered) and /api/payment/verify (full report)

function chanceFor(rank, cutoff) {
  if (rank <= cutoff * 0.85) return 'High'
  if (rank <= cutoff * 1.10) return 'Possible'
  return 'Dream'
}

function tierNum(t) {
  const n = parseInt(String(t || 'T9').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 9
}

export async function runPrediction(client, { rank, category, course, round, includeFullSectionA = false }) {
  const [collegesRes, coursesRes] = await Promise.all([
    client.from('colleges').select('college_code, college_name, tier, city'),
    client.from('courses').select('code, course_name'),
  ])
  if (collegesRes.error) throw new Error(collegesRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)

  const collegeMap = new Map((collegesRes.data || []).map((c) => [c.college_code, c]))
  const courseMap = new Map((coursesRes.data || []).map((c) => [c.code, c]))

  const { data: cutoffs, error: cutErr } = await client
    .from('cutoffs')
    .select('college_code, course_code, closing_rank, year, round, category')
    .eq('category', category)
    .eq('round', round)
  if (cutErr) throw new Error(cutErr.message)

  // --- Section A: rows for the selected course ---
  let sectionA = []
  if (course) {
    sectionA = (cutoffs || [])
      .filter((c) => c.course_code === course)
      .map((c) => {
        const col = collegeMap.get(c.college_code) || {}
        const cr = courseMap.get(c.course_code) || {}
        return {
          college_code: c.college_code,
          college_name: col.college_name || c.college_code,
          tier: col.tier || 'T?',
          city: col.city || '',
          course_code: c.course_code,
          course_name: cr.course_name || c.course_code,
          closing_rank: Number(c.closing_rank),
          chance: chanceFor(rank, Number(c.closing_rank)),
        }
      })
    if (!includeFullSectionA) {
      sectionA = sectionA.filter((r) => r.chance !== 'Dream' || rank <= r.closing_rank * 1.8)
    }
    sectionA.sort((a, b) => {
      const ta = tierNum(a.tier), tb = tierNum(b.tier)
      if (ta !== tb) return ta - tb
      return a.closing_rank - b.closing_rank
    })
  }

  // --- Section B: for each college, list courses that are High or Possible ---
  const buckets = new Map()
  for (const c of cutoffs || []) {
    const closing = Number(c.closing_rank)
    const chance = chanceFor(rank, closing)
    if (chance === 'Dream') continue
    const col = collegeMap.get(c.college_code)
    if (!col) continue
    if (!buckets.has(c.college_code)) {
      buckets.set(c.college_code, {
        college_code: c.college_code,
        college_name: col.college_name,
        tier: col.tier,
        city: col.city,
        courses: [],
      })
    }
    const cr = courseMap.get(c.course_code)
    buckets.get(c.college_code).courses.push({
      course_code: c.course_code,
      course_name: cr?.course_name || c.course_code,
      closing_rank: closing,
      chance,
    })
  }
  const sectionB = Array.from(buckets.values())
    .map((c) => {
      const m = new Map()
      for (const co of c.courses) {
        const existing = m.get(co.course_code)
        if (!existing || co.closing_rank < existing.closing_rank) m.set(co.course_code, co)
      }
      c.courses = Array.from(m.values()).sort((a, b) => a.closing_rank - b.closing_rank)
      return c
    })
    .sort((a, b) => {
      const ta = tierNum(a.tier), tb = tierNum(b.tier)
      if (ta !== tb) return ta - tb
      return b.courses.length - a.courses.length
    })

  return { sectionA, sectionB }
}

export { chanceFor, tierNum }
