// Quota engine for KCET College Predictor.
//
// Pure config + small pure functions. Adding a new quota means editing
// QUOTA_CONFIG only — no if/else churn elsewhere in the codebase.
//
// Confidence + probability buckets follow the official KCET Predictor
// Algorithm Upgrade spec:
//
//   margin% = (cutoff - rank) / cutoff * 100
//
//   Safe         margin >= 20
//   High Chance  10 <= margin < 20
//   Borderline    0 <= margin < 10
//   Low Chance  -10 <= margin <  0
//   Not Likely        margin < -10

// Base reservation categories that follow the G / R / K sub-quota pattern.
// (G = General-within-category, R = Rural-within-category, K = Kannada-within-category.)
export const BASE_CATEGORIES = [
  { code: 'GM', name: 'General Merit' },
  { code: '1', name: 'Category 1' },
  { code: '2A', name: 'Category 2A' },
  { code: '2B', name: 'Category 2B' },
  { code: '3A', name: 'Category 3A' },
  { code: '3B', name: 'Category 3B' },
  { code: 'SC', name: 'Scheduled Caste' },
  { code: 'ST', name: 'Scheduled Tribe' },
]

// Special categories that DO NOT follow the G/R/K pattern. Students can opt
// into one or more in addition to their base category. Cutoffs are looked up
// using these codes verbatim.
export const SPECIAL_CATEGORIES = [
  { code: 'D', name: 'Defence' },
  { code: 'DK', name: 'Defence Karnataka' },
  { code: 'XD', name: 'Ex-Defence' },
  { code: 'AGL', name: 'Anglo Indians' },
  { code: 'SPO', name: 'Sports Quota' },
  { code: 'NCC', name: 'National Cadet Corps' },
  { code: 'PWD', name: 'Persons with Disability' },
  { code: 'CAPF', name: 'Central Armed Police Forces' },
  { code: 'XCP', name: 'Ex-CAPF' },
  { code: 'SNQ', name: 'Supernumerary Quota' },
  { code: 'KK', name: 'Kalyana Karnataka (371J)' },
  { code: 'JK', name: 'Jammu & Kashmir Migrants' },
]

export const QUOTA_CONFIG = {
  // Suffixes appended to the base category code for each flag.
  flagSuffixes: {
    general: 'G',  // implicit — added automatically (Note: GM family has no G suffix)
    rural: 'R',
    kannada: 'K',
  },
  // Special-case: the "GM" base has no 'G' suffix; "GM" itself is the general code.
  generalSuffixOverrides: { GM: '' },
  // Open Merit (GM family) is also an eligible fallback for every non-GM student.
  openMeritFallback: true,
}

// Confidence ordering for sort and grouping.
export const CONFIDENCE_LIST = ['Safe', 'High Chance', 'Borderline', 'Low Chance', 'Not Likely']
export const CONFIDENCE_ORDER = Object.fromEntries(CONFIDENCE_LIST.map((c, i) => [c, i]))
export const CONFIDENCE_COLORS = {
  Safe:         { hex: '#10B981', emoji: '🟢' },
  'High Chance':{ hex: '#F59E0B', emoji: '🟡' },
  Borderline:   { hex: '#F97316', emoji: '🟠' },
  'Low Chance': { hex: '#EF4444', emoji: '🔴' },
  'Not Likely': { hex: '#64748B', emoji: '⚫' },
}

// ----- Eligible categories -----

/**
 * Given a student's profile, return the ORDERED list (most-specific first) of
 * KEA category codes whose cutoffs they may compete under.
 *
 * profile = {
 *   baseCategory: '2A' | 'GM' | 'SC' | ... | null,
 *   rural:        boolean,
 *   kannada:      boolean,
 *   special:      string[] (codes like 'PWD', 'D', etc.)
 * }
 *
 * Priority order per spec:
 *   1. Most specific quotas (BASE+R, BASE+K) — most-specific FIRST
 *   2. Base category general (BASE+G or 'GM' itself)
 *   3. General Merit (GM family) as ultimate fallback for non-GM students
 *   4. Special quotas appended last
 *
 * Each returned entry is annotated so the UI can render quota badges.
 */
export function getEligibleCategories(profile = {}) {
  const { baseCategory, rural = false, kannada = false, special = [] } = profile
  const base = String(baseCategory || 'GM').toUpperCase()
  const out = []
  const seen = new Set()
  const push = (code, label) => {
    if (!code || seen.has(code)) return
    seen.add(code)
    out.push({ code, label })
  }

  // --- Step 1: most specific quotas first (Rural / Kannada) ---
  if (rural) push(base + QUOTA_CONFIG.flagSuffixes.rural, `${base} Rural`)
  if (kannada) push(base + QUOTA_CONFIG.flagSuffixes.kannada, `${base} Kannada`)

  // --- Step 2: base category general ---
  const generalSuffix = QUOTA_CONFIG.generalSuffixOverrides[base] ?? QUOTA_CONFIG.flagSuffixes.general
  const generalCode = base + generalSuffix
  push(generalCode, base === 'GM' ? 'General Merit' : `${base} General`)

  // --- Step 3: Open Merit (GM family) fallback for non-GM students ---
  if (QUOTA_CONFIG.openMeritFallback && base !== 'GM') {
    if (rural) push('GM' + QUOTA_CONFIG.flagSuffixes.rural, 'GM Rural')
    if (kannada) push('GM' + QUOTA_CONFIG.flagSuffixes.kannada, 'GM Kannada')
    push('GM', 'General Merit (Open)')
  }

  // --- Step 4: Special categories appended last ---
  for (const s of special || []) {
    const code = String(s || '').toUpperCase().trim()
    if (!code) continue
    const def = SPECIAL_CATEGORIES.find((x) => x.code === code)
    push(code, def?.name || code)
  }

  return out
}

// ----- Confidence + probability per the spec -----

/**
 * Bucket per the spec (marginPct is a PERCENT, not ratio):
 *   marginPct >= 20  -> Safe
 *   10 <= marginPct < 20  -> High Chance
 *    0 <= marginPct < 10  -> Borderline
 *  -10 <= marginPct <  0  -> Low Chance
 *        marginPct < -10  -> Not Likely
 */
export function confidenceForMarginPct(marginPct) {
  if (marginPct >= 20) return 'Safe'
  if (marginPct >= 10) return 'High Chance'
  if (marginPct >= 0)  return 'Borderline'
  if (marginPct >= -10) return 'Low Chance'
  return 'Not Likely'
}

/**
 * Estimate a percent probability from the proportional margin (in %).
 *   marginPct >= 30     -> 95..99
 *   20 <= marginPct <30 -> 85..95
 *   10 <= marginPct <20 -> 70..85
 *    0 <= marginPct <10 -> 50..70
 *  -10 <= marginPct < 0 -> 25..50
 *        marginPct <-10 -> 10..24
 */
export function probabilityForMarginPct(marginPct) {
  let p
  if (marginPct >= 30) {
    p = 95 + Math.min(4, Math.floor((marginPct - 30) / 10)) // 95..99
  } else if (marginPct >= 20) {
    p = 85 + Math.floor(((marginPct - 20) / 10) * 10) // 85..94
  } else if (marginPct >= 10) {
    p = 70 + Math.floor(((marginPct - 10) / 10) * 15) // 70..84
  } else if (marginPct >= 0) {
    p = 50 + Math.floor((marginPct / 10) * 20) // 50..69
  } else if (marginPct >= -10) {
    p = 25 + Math.floor(((marginPct + 10) / 10) * 25) // 25..49
  } else {
    // < -10: decay from 24 down to 10 over [-10 .. -50+]
    const over = -marginPct - 10
    p = Math.max(10, 24 - Math.floor(over / 4))
  }
  return Math.max(10, Math.min(99, p))
}

// ----- Per college+branch scorer (multi-quota) -----

/**
 * Given the student's rank, their eligible category codes, and a map of
 * { categoryCode -> closing_rank } for ONE college+branch, return:
 *
 *   {
 *     matchedQuotas:    [{code, label, cutoff, margin, probability}],
 *                       // quotas where studentRank <= cutoff (admitted)
 *     consideredQuotas: [{code, label, cutoff, margin, probability, admitted}],
 *                       // every eligible quota that had data
 *     bestQuota:        string, // code of the quota with the largest cutoff (most lenient)
 *     bestQuotaLabel:   string,
 *     bestCutoff:       number,
 *     margin:           number, // PERCENT, signed
 *     confidence:       string,
 *     probability:      number,
 *   }
 *
 * Returns null only if NO eligible category had any cutoff data for this
 * branch (i.e. the college+branch has zero relevant cutoff rows). In that
 * case, callers may choose to skip the row entirely.
 */
export function scoreBranch({ studentRank, eligibleCategories, cutoffsByCategory }) {
  const considered = []
  const matched = []
  for (const { code, label } of eligibleCategories) {
    const raw = cutoffsByCategory?.[code]
    if (raw == null || raw === '') continue
    const cutoff = Number(raw)
    if (!Number.isFinite(cutoff) || cutoff <= 0) continue
    const marginPct = ((cutoff - studentRank) / cutoff) * 100
    const probability = probabilityForMarginPct(marginPct)
    const admitted = studentRank <= cutoff
    const entry = { code, label, cutoff, margin: marginPct, probability, admitted }
    considered.push(entry)
    if (admitted) matched.push(entry)
  }
  if (considered.length === 0) return null

  // "Best quota" = the one with the LARGEST cutoff = most lenient = best chance.
  // Per spec: "If multiple quotas match, show the quota giving the highest cutoff rank."
  const best = considered.reduce((a, b) => (a.cutoff >= b.cutoff ? a : b))
  return {
    matchedQuotas: matched,
    consideredQuotas: considered,
    bestQuota: best.code,
    bestQuotaLabel: best.label,
    bestCutoff: best.cutoff,
    margin: best.margin,
    probability: best.probability,
    confidence: confidenceForMarginPct(best.margin),
  }
}

// ----- Backward compat: derive a profile from a single legacy category code -----
export function profileFromLegacyCategory(legacyCode) {
  if (!legacyCode) return { baseCategory: 'GM', rural: false, kannada: false, special: [] }
  const c = String(legacyCode).toUpperCase()
  const SPECIAL = new Set(SPECIAL_CATEGORIES.map((s) => s.code))
  if (SPECIAL.has(c)) return { baseCategory: 'GM', rural: false, kannada: false, special: [c] }
  if (c === 'GM') return { baseCategory: 'GM', rural: false, kannada: false, special: [] }
  if (c === 'GMR') return { baseCategory: 'GM', rural: true, kannada: false, special: [] }
  if (c === 'GMK') return { baseCategory: 'GM', rural: false, kannada: true, special: [] }
  if (c.endsWith('R')) return { baseCategory: c.slice(0, -1), rural: true, kannada: false, special: [] }
  if (c.endsWith('K')) return { baseCategory: c.slice(0, -1), rural: false, kannada: true, special: [] }
  if (c.endsWith('G')) return { baseCategory: c.slice(0, -1), rural: false, kannada: false, special: [] }
  // Fall through: pass through as a base
  return { baseCategory: c, rural: false, kannada: false, special: [] }
}

// ----- Profile helpers used by the API layer -----
export function normalizeProfile(input = {}) {
  // Accept either the new (baseCategory + flags) or the legacy (category) payload.
  if (input.baseCategory || input.rural || input.kannada || (input.special && input.special.length)) {
    return {
      baseCategory: String(input.baseCategory || 'GM').toUpperCase(),
      rural: !!input.rural,
      kannada: !!input.kannada,
      special: Array.isArray(input.special) ? input.special.map((s) => String(s).toUpperCase()).filter(Boolean) : [],
    }
  }
  if (input.category) {
    return profileFromLegacyCategory(input.category)
  }
  return { baseCategory: 'GM', rural: false, kannada: false, special: [] }
}

/** Human-readable description of the profile (used in result headers, PDF). */
export function describeProfile(p) {
  const parts = [p.baseCategory || 'GM']
  if (p.rural) parts.push('Rural')
  if (p.kannada) parts.push('Kannada Medium')
  if (p.special && p.special.length) parts.push(...p.special)
  return parts.join(' · ')
}
