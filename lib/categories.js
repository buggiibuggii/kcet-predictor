// KEA / KCET 2026 reservation categories — grouped

export const CATEGORY_GROUPS = [
  {
    group: 'General Merit',
    options: [
      { code: 'GM', name: 'General Merit' },
      { code: 'GMR', name: 'General Merit Rural' },
      { code: 'GMK', name: 'General Merit Kannada' },
    ],
  },
  {
    group: 'Category 1',
    options: [
      { code: '1G', name: 'Category 1 General' },
      { code: '1R', name: 'Category 1 Rural' },
      { code: '1K', name: 'Category 1 Kannada' },
    ],
  },
  {
    group: 'Category 2A',
    options: [
      { code: '2AG', name: 'Category 2A General' },
      { code: '2AR', name: 'Category 2A Rural' },
      { code: '2AK', name: 'Category 2A Kannada' },
    ],
  },
  {
    group: 'Category 2B',
    options: [
      { code: '2BG', name: 'Category 2B General' },
      { code: '2BR', name: 'Category 2B Rural' },
      { code: '2BK', name: 'Category 2B Kannada' },
    ],
  },
  {
    group: 'Category 3A',
    options: [
      { code: '3AG', name: 'Category 3A General' },
      { code: '3AR', name: 'Category 3A Rural' },
      { code: '3AK', name: 'Category 3A Kannada' },
    ],
  },
  {
    group: 'Category 3B',
    options: [
      { code: '3BG', name: 'Category 3B General' },
      { code: '3BR', name: 'Category 3B Rural' },
      { code: '3BK', name: 'Category 3B Kannada' },
    ],
  },
  {
    group: 'Scheduled Caste',
    options: [
      { code: 'SCG', name: 'Scheduled Caste General' },
      { code: 'SCR', name: 'Scheduled Caste Rural' },
      { code: 'SCK', name: 'Scheduled Caste Kannada' },
    ],
  },
  {
    group: 'Scheduled Tribe',
    options: [
      { code: 'STG', name: 'Scheduled Tribe General' },
      { code: 'STR', name: 'Scheduled Tribe Rural' },
      { code: 'STK', name: 'Scheduled Tribe Kannada' },
    ],
  },
  {
    group: 'Special Categories',
    options: [
      { code: 'D', name: 'Defence' },
      { code: 'DK', name: 'Defence Karnataka' },
      { code: 'XD', name: 'Ex-Defence' },
      { code: 'AGL', name: 'Anglo Indians' },
      { code: 'SPO', name: 'Sports Quota' },
      { code: 'NCC', name: 'National Cadet Corps' },
      { code: 'PWD', name: 'Persons with Disability' },
      { code: 'CAPF', name: 'Central Armed Police Forces' },
      { code: 'XCP', name: 'Ex-Central Armed Police Forces' },
      { code: 'SNQ', name: 'Supernumerary Quota' },
      { code: 'GMP', name: 'General Merit Private' },
    ],
  },
  {
    group: 'Regional Categories',
    options: [
      { code: 'KK', name: 'Kalyana Karnataka Region (371J)' },
      { code: 'JK', name: 'Jammu and Kashmir Migrants' },
    ],
  },
]

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.options.map((o) => o.code))

export function findCategory(code) {
  for (const g of CATEGORY_GROUPS) {
    const f = g.options.find((o) => o.code === code)
    if (f) return { ...f, group: g.group }
  }
  return null
}

export function formatCategoryLabel(code) {
  const c = findCategory(code)
  return c ? `${c.code} - ${c.name}` : code
}

// Multipliers used by the seed generator (and as a guidance baseline).
// Lower = more competitive (closer to GM). Higher = relaxed cutoff (larger closing rank).
export const CATEGORY_MULTIPLIERS = {
  // General Merit
  GM: 1.0, GMR: 1.08, GMK: 1.05, GMP: 1.0,
  // Cat 1
  '1G': 1.40, '1R': 1.55, '1K': 1.45,
  // Cat 2A
  '2AG': 1.30, '2AR': 1.45, '2AK': 1.35,
  // Cat 2B
  '2BG': 1.50, '2BR': 1.65, '2BK': 1.55,
  // Cat 3A
  '3AG': 1.60, '3AR': 1.75, '3AK': 1.65,
  // Cat 3B
  '3BG': 1.50, '3BR': 1.65, '3BK': 1.55,
  // SC
  SCG: 2.20, SCR: 2.40, SCK: 2.30,
  // ST
  STG: 2.80, STR: 3.00, STK: 2.90,
  // Special
  D: 1.6, DK: 1.5, XD: 1.7, AGL: 2.0, SPO: 1.9, NCC: 1.85,
  PWD: 2.5, CAPF: 1.9, XCP: 2.0, SNQ: 1.3,
  // Regional
  KK: 1.4, JK: 2.0,
}
