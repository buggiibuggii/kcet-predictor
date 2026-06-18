// Multi-quota prediction engine for KCET College Predictor.
//
// Replaces the single-category lookup with a path that:
//   1. Determines ALL eligible quota codes from the student profile.
//   2. Pulls cutoffs for ALL those codes in ONE query (filtered by round/year).
//   3. Groups cutoffs per (college, course) and feeds them to scoreBranch.
//   4. Returns a flat result list + grouped buckets (Safe/High/Borderline/Low/Not Likely).
//
// The result shape is documented in README-style at the bottom of this file.

import {
  getEligibleCategories,
  scoreBranch,
  CONFIDENCE_LIST,
  CONFIDENCE_ORDER,
  normalizeProfile,
  describeProfile,
} from './quotaEngine'

function tierNum(t) {
  const n = parseInt(String(t || 'T9').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 9
}

/**
 * Build a {college_code -> {course_code -> {category -> closing_rank}}} index.
 */
function indexCutoffs(cutoffs) {
  const idx = new Map()
  for (const c of cutoffs || []) {
    const college = c.college_code
    const course = c.course_code
    const cat = c.category
    if (!college || !course || !cat) continue
    if (!idx.has(college)) idx.set(college, new Map())
    const byCourse = idx.get(college)
    if (!byCourse.has(course)) byCourse.set(course, {})
    byCourse.get(course)[cat] = c.closing_rank
  }
  return idx
}

/**
 * Determine the most recent year for which cutoff data exists matching the
 * given round + any of the eligible category codes.
 */
async function pickEffectiveYear(client, { round, categoryCodes, explicitYear }) {
  if (explicitYear) return Number(explicitYear)
  const { data, error } = await client
    .from('cutoffs')
    .select('year')
    .in('category', categoryCodes)
    .eq('round', round)
    .order('year', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return Number(data[0].year)
}

/**
 * Main entry point.
 *
 * params = {
 *   rank:        number,
 *   profile:     { baseCategory, rural, kannada, special[] },
 *   course:      string | null,   // narrow Section A to this course
 *   round:       string,
 *   year:        number | null,   // optional override
 *   includeAll:  boolean,         // true = include Not Likely too (for PDF)
 * }
 */
export async function runMultiQuotaPrediction(client, params) {
  const {
    rank,
    profile: rawProfile,
    course,
    round,
    year: explicitYear = null,
    includeAll = false,
  } = params

  const profile = normalizeProfile(rawProfile || {})
  const eligibleCategories = getEligibleCategories(profile)
  const categoryCodes = eligibleCategories.map((c) => c.code)
  if (!categoryCodes.length) {
    return { results: [], grouped: emptyGrouped(), sectionB: [], meta: { eligibleCategories: [], effectiveYear: null, profile } }
  }

  // 1. Fetch reference tables in parallel
  const [collegesRes, coursesRes] = await Promise.all([
    client.from('colleges').select('college_code, college_name, tier, city'),
    client.from('courses').select('code, course_name'),
  ])
  if (collegesRes.error) throw new Error(collegesRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)
  const collegeMap = new Map((collegesRes.data || []).map((c) => [c.college_code, c]))
  const courseMap = new Map((coursesRes.data || []).map((c) => [c.code, c]))

  // 2. Determine effective year
  const effectiveYear = await pickEffectiveYear(client, {
    round, categoryCodes, explicitYear,
  })

  // 3. Pull cutoffs for ALL eligible categories in one query.
  // Supabase has a server-side row cap; we paginate to be safe (up to 100k rows
  // — KCET has ~250 colleges × ~30 branches × ~10 categories ≈ 75k max).
  let cutoffs = []
  const PAGE = 10000
  let from = 0
  while (true) {
    let q = client
      .from('cutoffs')
      .select('college_code, course_code, closing_rank, year, round, category')
      .in('category', categoryCodes)
      .eq('round', round)
      .range(from, from + PAGE - 1)
    if (effectiveYear) q = q.eq('year', effectiveYear)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    cutoffs = cutoffs.concat(data)
    if (data.length < PAGE) break
    from += PAGE
    if (from > 100000) break // safety
  }

  // 4. Index by (college, course) -> { category -> rank }
  const cutoffIndex = indexCutoffs(cutoffs)

  // 5. Score every (college, course) pair we have data for
  const results = []
  for (const [collegeCode, byCourse] of cutoffIndex.entries()) {
    const col = collegeMap.get(collegeCode)
    if (!col) continue
    for (const [courseCode, cutoffsByCategory] of byCourse.entries()) {
      const cr = courseMap.get(courseCode)
      const scored = scoreBranch({
        studentRank: Number(rank),
        eligibleCategories,
        cutoffsByCategory,
      })
      if (!scored) continue
      results.push({
        college_code: collegeCode,
        college_name: col.college_name || collegeCode,
        tier: col.tier || 'T?',
        city: col.city || '',
        course_code: courseCode,
        course_name: cr?.course_name || courseCode,
        round,
        year: effectiveYear,
        bestQuota: scored.bestQuota,
        bestQuotaLabel: scored.bestQuotaLabel,
        bestCutoff: scored.bestCutoff,
        studentRank: Number(rank),
        margin: scored.margin,                // percent, signed
        confidence: scored.confidence,
        probability: scored.probability,
        matchedQuotas: scored.matchedQuotas,  // [{code, label, cutoff, margin, probability}]
        consideredQuotas: scored.consideredQuotas,
      })
    }
  }

  // 6. Sort within each confidence bucket by probability DESC, then bestCutoff DESC
  function compare(a, b) {
    const oa = CONFIDENCE_ORDER[a.confidence] ?? 9
    const ob = CONFIDENCE_ORDER[b.confidence] ?? 9
    if (oa !== ob) return oa - ob
    if (b.probability !== a.probability) return b.probability - a.probability
    if (b.bestCutoff !== a.bestCutoff) return b.bestCutoff - a.bestCutoff
    return tierNum(a.tier) - tierNum(b.tier)
  }
  results.sort(compare)

  // 7. Section A = filtered to chosen course (if any)
  let sectionA = course ? results.filter((r) => r.course_code === course) : results.slice()

  // Default: include all confidence levels (per spec: don't hide colleges)
  // For free predict, we may want to cap Not Likely to keep response small.
  if (!includeAll) {
    sectionA = sectionA.slice(0, 200) // cap for free tier
  }

  // 8. Grouped (for the new UI)
  const grouped = emptyGrouped()
  for (const r of sectionA) {
    if (grouped[r.confidence]) grouped[r.confidence].push(r)
  }

  // 9. Section B = grouped by college, showing all branches across ALL courses
  //    Only Safe / High Chance / Borderline by default (Low/Not Likely too noisy).
  const sbBuckets = new Map()
  const sbConfidenceFilter = includeAll
    ? new Set(['Safe', 'High Chance', 'Borderline', 'Low Chance', 'Not Likely'])
    : new Set(['Safe', 'High Chance', 'Borderline'])
  for (const r of results) {
    if (!sbConfidenceFilter.has(r.confidence)) continue
    if (!sbBuckets.has(r.college_code)) {
      sbBuckets.set(r.college_code, {
        college_code: r.college_code,
        college_name: r.college_name,
        tier: r.tier,
        city: r.city,
        courses: [],
      })
    }
    const bucket = sbBuckets.get(r.college_code)
    // pick best branch per course
    const existing = bucket.courses.find((co) => co.course_code === r.course_code)
    if (!existing || r.probability > existing.probability) {
      const next = {
        course_code: r.course_code,
        course_name: r.course_name,
        closing_rank: r.bestCutoff,
        confidence: r.confidence,
        probability: r.probability,
        bestQuota: r.bestQuota,
      }
      if (existing) Object.assign(existing, next)
      else bucket.courses.push(next)
    }
  }
  const sectionB = Array.from(sbBuckets.values())
    .map((c) => {
      c.courses.sort((a, b) => b.probability - a.probability || b.closing_rank - a.closing_rank)
      return c
    })
    .sort((a, b) => {
      const ta = tierNum(a.tier), tb = tierNum(b.tier)
      if (ta !== tb) return ta - tb
      return b.courses.length - a.courses.length
    })

  return {
    results: sectionA,
    grouped,
    sectionB,
    meta: {
      eligibleCategories,
      effectiveYear,
      profile,
      profileLabel: describeProfile(profile),
      totalConsidered: results.length,
    },
  }
}

function emptyGrouped() {
  return Object.fromEntries(CONFIDENCE_LIST.map((c) => [c, []]))
}

// ----- Legacy single-category API kept for backward compatibility -----
// Older endpoints (currently only the legacy /api/payment/verify path) still
// call runPrediction(client, { rank, category, ... }). We translate to the new
// engine and project the result to the OLD shape (sectionA/sectionB).
export async function runPrediction(client, legacyParams = {}) {
  const profile = normalizeProfile(legacyParams)
  const { results, sectionB, meta } = await runMultiQuotaPrediction(client, {
    rank: legacyParams.rank,
    profile,
    course: legacyParams.course,
    round: legacyParams.round,
    year: legacyParams.year,
    includeAll: !!legacyParams.includeFullSectionA,
  })
  // Map to legacy shape: chance string instead of confidence
  const legacyChance = (conf) => {
    if (conf === 'Safe' || conf === 'High Chance') return 'High'
    if (conf === 'Borderline') return 'Possible'
    return 'Dream'
  }
  const sectionA = results.map((r) => ({
    college_code: r.college_code,
    college_name: r.college_name,
    tier: r.tier,
    city: r.city,
    course_code: r.course_code,
    course_name: r.course_name,
    closing_rank: r.bestCutoff,
    chance: legacyChance(r.confidence),
  }))
  const legacySectionB = sectionB.map((c) => ({
    college_code: c.college_code,
    college_name: c.college_name,
    tier: c.tier,
    city: c.city,
    courses: c.courses.map((co) => ({
      course_code: co.course_code,
      course_name: co.course_name,
      closing_rank: co.closing_rank,
      chance: legacyChance(co.confidence),
    })),
  }))
  return { sectionA, sectionB: legacySectionB, meta }
}

// Re-export helpers used by API layer
export { tierNum }
