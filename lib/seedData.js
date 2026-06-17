// Demo dataset for KCET College Predictor — realistic but fictional cutoffs
import { CATEGORY_GROUPS, ALL_CATEGORIES, CATEGORY_MULTIPLIERS } from './categories'

export const SEED_COLLEGES = [
  { college_code: 'E001', college_name: 'R V College of Engineering', tier: 'T1', city: 'Bengaluru' },
  { college_code: 'E002', college_name: 'BMS College of Engineering', tier: 'T1', city: 'Bengaluru' },
  { college_code: 'E003', college_name: 'PES University - EC Campus', tier: 'T1', city: 'Bengaluru' },
  { college_code: 'E004', college_name: 'M S Ramaiah Institute of Technology', tier: 'T1', city: 'Bengaluru' },
  { college_code: 'E005', college_name: 'Dayananda Sagar College of Engineering', tier: 'T2', city: 'Bengaluru' },
  { college_code: 'E006', college_name: 'Sir M Visvesvaraya Institute of Technology', tier: 'T2', city: 'Bengaluru' },
  { college_code: 'E007', college_name: 'BNM Institute of Technology', tier: 'T2', city: 'Bengaluru' },
  { college_code: 'E008', college_name: 'RNS Institute of Technology', tier: 'T2', city: 'Bengaluru' },
  { college_code: 'E009', college_name: 'JSS Science & Technology University', tier: 'T2', city: 'Mysuru' },
  { college_code: 'E010', college_name: 'NIE Institute of Technology', tier: 'T3', city: 'Mysuru' },
  { college_code: 'E011', college_name: 'Acharya Institute of Technology', tier: 'T3', city: 'Bengaluru' },
  { college_code: 'E012', college_name: 'New Horizon College of Engineering', tier: 'T3', city: 'Bengaluru' },
  { college_code: 'E013', college_name: 'KLE Technological University', tier: 'T2', city: 'Hubballi' },
  { college_code: 'E014', college_name: 'SDM College of Engineering & Technology', tier: 'T2', city: 'Dharwad' },
  { college_code: 'E015', college_name: 'NMAM Institute of Technology', tier: 'T2', city: 'Nitte' },
]

export const SEED_COURSES = [
  { code: 'CS', course_name: 'Computer Science & Engineering' },
  { code: 'IS', course_name: 'Information Science & Engineering' },
  { code: 'AI', course_name: 'Artificial Intelligence & Machine Learning' },
  { code: 'DS', course_name: 'Computer Science (Data Science)' },
  { code: 'CY', course_name: 'Computer Science (Cyber Security)' },
  { code: 'EC', course_name: 'Electronics & Communication Engineering' },
  { code: 'EE', course_name: 'Electrical & Electronics Engineering' },
  { code: 'EI', course_name: 'Electronics & Instrumentation Engineering' },
  { code: 'ME', course_name: 'Mechanical Engineering' },
  { code: 'CV', course_name: 'Civil Engineering' },
  { code: 'CH', course_name: 'Chemical Engineering' },
  { code: 'BT', course_name: 'Biotechnology' },
]

export const CATEGORIES = ALL_CATEGORIES
export const ROUNDS = ['R1', 'R2', 'Extended']

function baseCutoff(tier, courseCode) {
  const courseFactor = {
    CS: 1.0, AI: 1.05, DS: 1.10, CY: 1.15, IS: 1.20,
    EC: 1.40, EE: 1.80, EI: 2.20, ME: 2.40, CV: 2.80, CH: 2.60, BT: 3.20,
  }[courseCode] || 2.0
  const tierAnchor = { T1: 800, T2: 8000, T3: 25000 }[tier] || 30000
  return Math.round(tierAnchor * courseFactor)
}

function categoryMultiplier(cat) {
  return CATEGORY_MULTIPLIERS[cat] ?? 1.5
}

function roundMultiplier(r) {
  return { R1: 1.0, R2: 1.15, Extended: 1.35 }[r] || 1.0
}

export function generateSeedCutoffs(year = 2024) {
  const rows = []
  for (const college of SEED_COLLEGES) {
    for (const course of SEED_COURSES) {
      for (const cat of ALL_CATEGORIES) {
        for (const round of ROUNDS) {
          const base = baseCutoff(college.tier, course.code)
          const closing = Math.max(
            10,
            Math.round(base * categoryMultiplier(cat) * roundMultiplier(round))
          )
          rows.push({
            year,
            round,
            category: cat,
            college_code: college.college_code,
            course_code: course.code,
            closing_rank: closing,
          })
        }
      }
    }
  }
  return rows
}
