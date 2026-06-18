import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CONFIDENCE_LIST, CONFIDENCE_COLORS } from './quotaEngine'

const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  rowAlt: '#F1F5F9',
}

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 10, color: COLORS.text, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  brandBox: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: 'white', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  small: { fontSize: 9, color: COLORS.muted },
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 22, marginBottom: 4 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 16, marginBottom: 10 },
  sub: { fontSize: 11, color: COLORS.muted, marginBottom: 14 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  metaCell: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  metaLabel: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  metaValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  statsRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.bg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { fontSize: 8, color: COLORS.muted },
  statValue: { fontFamily: 'Helvetica-Bold', fontSize: 18, marginTop: 2, color: COLORS.primaryDark },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  trh: { flexDirection: 'row', backgroundColor: COLORS.primary },
  th: { padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', color: 'white' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  trAlt: { backgroundColor: COLORS.rowAlt },
  td: { padding: 6, fontSize: 8.5 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 8, color: 'white', fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: COLORS.muted, textAlign: 'center' },
  pageNumber: { position: 'absolute', bottom: 18, right: 36, fontSize: 8, color: COLORS.muted },
  empty: { padding: 14, textAlign: 'center', color: COLORS.muted, fontSize: 10 },
  disclaimer: { marginTop: 16, padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, backgroundColor: COLORS.bg, fontSize: 9, color: COLORS.muted },
  bullet: { flexDirection: 'row', marginBottom: 6 },
  bulletDot: { width: 16, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, fontSize: 7.5, marginRight: 3, marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  legendCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
})

const Header = ({ subtitle }) => (
  <View style={styles.header} fixed>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={styles.brandBox}>KCET 2026</Text>
      <Text style={styles.brand}>College Predictor</Text>
    </View>
    <Text style={styles.small}>{subtitle}</Text>
  </View>
)

const Footer = () => (
  <>
    <Text style={styles.footer} fixed>
      www.kcetpredictor.in  ·  Confidential premium report  ·  Multi-quota engine
    </Text>
    <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </>
)

const ConfidenceBadge = ({ confidence }) => {
  const cfg = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS['Borderline']
  return <Text style={[styles.badge, { backgroundColor: cfg.hex }]}>{confidence}</Text>
}

const QuotaChipsPdf = ({ quotas, best }) => {
  if (!quotas || !quotas.length) return <Text style={{ fontSize: 8, color: COLORS.muted }}>—</Text>
  return (
    <View style={styles.chipsRow}>
      {quotas.map((q) => {
        const isBest = q.code === best
        return (
          <Text
            key={q.code}
            style={[styles.chip, {
              backgroundColor: isBest ? '#10B98122' : '#E2E8F0',
              color: isBest ? '#047857' : COLORS.text,
            }]}
          >
            {isBest ? '* ' : ''}{q.code}
          </Text>
        )
      })}
    </View>
  )
}

const ResultsTable = ({ rows }) => {
  if (!rows.length) return <View style={styles.table}><Text style={styles.empty}>No colleges in this bucket.</Text></View>
  return (
    <View style={styles.table}>
      <View style={styles.trh}>
        <Text style={[styles.th, { width: '40%' }]}>College & Eligible Quotas</Text>
        <Text style={[styles.th, { width: '20%' }]}>Branch</Text>
        <Text style={[styles.th, { width: '12%', textAlign: 'right' }]}>Cutoff</Text>
        <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Margin</Text>
        <Text style={[styles.th, { width: '8%', textAlign: 'right' }]}>Prob.</Text>
        <Text style={[styles.th, { width: '10%' }]}>Best</Text>
      </View>
      {rows.map((r, i) => (
        <View style={[styles.tr, i % 2 === 1 ? styles.trAlt : null]} key={`${r.college_code}-${r.course_code}-${i}`} wrap={false}>
          <View style={{ width: '40%', padding: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{r.college_name}</Text>
            <Text style={{ fontSize: 8, color: COLORS.muted, marginTop: 1 }}>
              {r.city ? r.city + ' · ' : ''}{r.college_code} · {r.tier || 'T?'}
            </Text>
            <QuotaChipsPdf
              quotas={r.matchedQuotas?.length ? r.matchedQuotas : r.consideredQuotas}
              best={r.bestQuota}
            />
          </View>
          <View style={{ width: '20%', padding: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{r.course_code}</Text>
            <Text style={{ fontSize: 7.5, color: COLORS.muted }}>{r.course_name}</Text>
          </View>
          <Text style={[styles.td, { width: '12%', textAlign: 'right' }]}>{Number(r.bestCutoff).toLocaleString()}</Text>
          <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{(r.margin >= 0 ? '+' : '') + r.margin.toFixed(1)}%</Text>
          <Text style={[styles.td, { width: '8%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{r.probability}%</Text>
          <Text style={[styles.td, { width: '10%', fontFamily: 'Helvetica-Bold' }]}>{r.bestQuota}</Text>
        </View>
      ))}
    </View>
  )
}

const SectionBTable = ({ rows }) => {
  if (!rows.length) return <View style={styles.table}><Text style={styles.empty}>No obtainable colleges.</Text></View>
  return (
    <View style={styles.table}>
      <View style={styles.trh}>
        <Text style={[styles.th, { width: '38%' }]}>College</Text>
        <Text style={[styles.th, { width: '10%' }]}>Tier</Text>
        <Text style={[styles.th, { width: '52%' }]}>Available Branches (best quota · cutoff · probability)</Text>
      </View>
      {rows.map((c, i) => (
        <View style={[styles.tr, i % 2 === 1 ? styles.trAlt : null]} key={c.college_code} wrap={false}>
          <View style={{ width: '38%', padding: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{c.college_name}</Text>
            <Text style={{ fontSize: 8, color: COLORS.muted, marginTop: 1 }}>{c.city} · {c.college_code}</Text>
          </View>
          <Text style={[styles.td, { width: '10%' }]}>{c.tier}</Text>
          <View style={{ width: '52%', padding: 6 }}>
            <Text style={{ fontSize: 8 }}>
              {c.courses.map((co) => `${co.course_code} (${co.bestQuota} · ${Number(co.closing_rank).toLocaleString()} · ${co.probability}%)`).join(', ')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const OptionOrderTable = ({ rows }) => {
  if (!rows.length) return <View style={styles.table}><Text style={styles.empty}>No recommendations.</Text></View>
  return (
    <View style={styles.table}>
      <View style={styles.trh}>
        <Text style={[styles.th, { width: '6%' }]}>#</Text>
        <Text style={[styles.th, { width: '15%' }]}>Confidence</Text>
        <Text style={[styles.th, { width: '40%' }]}>College</Text>
        <Text style={[styles.th, { width: '17%' }]}>Branch</Text>
        <Text style={[styles.th, { width: '10%' }]}>Quota</Text>
        <Text style={[styles.th, { width: '12%', textAlign: 'right' }]}>Probability</Text>
      </View>
      {rows.map((r, i) => (
        <View style={[styles.tr, i % 2 === 1 ? styles.trAlt : null]} key={`${r.college_code}-${r.course_code}-${i}`} wrap={false}>
          <Text style={[styles.td, { width: '6%' }]}>{i + 1}</Text>
          <View style={[styles.td, { width: '15%' }]}><ConfidenceBadge confidence={r.confidence} /></View>
          <View style={{ width: '40%', padding: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{r.college_name}</Text>
            <Text style={{ fontSize: 8, color: COLORS.muted }}>{r.college_code} · {r.tier}</Text>
          </View>
          <View style={{ width: '17%', padding: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{r.course_code}</Text>
            <Text style={{ fontSize: 7.5, color: COLORS.muted }}>{r.course_name}</Text>
          </View>
          <Text style={[styles.td, { width: '10%', fontFamily: 'Helvetica-Bold' }]}>{r.bestQuota}</Text>
          <Text style={[styles.td, { width: '12%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{r.probability}%</Text>
        </View>
      ))}
    </View>
  )
}

const ConfidenceLegend = () => (
  <View style={styles.legendCard}>
    {CONFIDENCE_LIST.map((c) => {
      const cfg = CONFIDENCE_COLORS[c]
      return (
        <View key={c} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: cfg.hex }]} />
          <Text style={{ fontSize: 8, color: COLORS.text }}>{c}</Text>
        </View>
      )
    })}
  </View>
)

function ReportDocument({ input, results = [], grouped = {}, sectionB = [] }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const sub = `Premium Report · ${dateStr}`
  const profile = input.profile || {}
  const profileLabel = input.profileLabel || [
    profile.baseCategory || 'GM',
    profile.rural && 'Rural',
    profile.kannada && 'Kannada Medium',
    ...(profile.special || []),
  ].filter(Boolean).join(' · ')

  const counts = Object.fromEntries(CONFIDENCE_LIST.map((c) => [c, (grouped[c] || []).length]))
  const eligibleCats = input.eligibleCategories || []

  // Option-entry order list = Safe → High → Borderline → Low (skip Not Likely)
  const optionOrder = []
  for (const c of CONFIDENCE_LIST) {
    if (c === 'Not Likely') continue
    for (const r of grouped[c] || []) optionOrder.push({ ...r, confidence: c })
  }
  const optionLimited = optionOrder.slice(0, 80)

  return (
    <Document title="KCET Predictor Report" author="KCET Predictor 2026">
      {/* Page 1: Cover */}
      <Page size="A4" style={styles.page}>
        <Header subtitle={sub} />
        <Text style={styles.h1}>Your Personalized College Report</Text>
        <Text style={styles.sub}>Multi-Quota Engine · Based on the latest KEA closing ranks · Predictions for KCET 2026 counselling.</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>KCET Rank</Text>
            <Text style={styles.metaValue}>{Number(input.rank).toLocaleString()}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Profile</Text>
            <Text style={styles.metaValue}>{profileLabel}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Selected Course</Text>
            <Text style={styles.metaValue}>{input.course_name || input.course || '—'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Round</Text>
            <Text style={styles.metaValue}>{input.round}</Text>
          </View>
          <View style={[styles.metaCell, { width: '100%' }]}>
            <Text style={styles.metaLabel}>Quotas Evaluated</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
              {eligibleCats.map((c, i) => (
                <Text key={`${c.code}-${i}`} style={[styles.chip, { backgroundColor: '#EEF2FF', color: COLORS.primaryDark }]}>{c.code}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Confidence count tiles */}
        <View style={styles.statsRow}>
          {CONFIDENCE_LIST.map((c) => {
            const cfg = CONFIDENCE_COLORS[c]
            return (
              <View key={c} style={[styles.statCard, { borderTopWidth: 3, borderTopColor: cfg.hex }]}>
                <Text style={styles.statLabel}>{c}</Text>
                <Text style={styles.statValue}>{counts[c]}</Text>
              </View>
            )
          })}
        </View>

        <Text style={[styles.h2, { marginTop: 22 }]}>How to read this report</Text>
        <ConfidenceLegend />
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text>For every college and branch we check ALL quotas you qualify for (Rural, Kannada, General, GM fallback, Special).</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text>Best Quota = the quota that gives the highest cutoff rank (= best chance).</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text>Margin % = (cutoff − your rank) / cutoff × 100. Probability is derived from the margin.</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text>Pages 2–6 list results grouped by Confidence. Page 7 is the suggested KEA option-entry order.</Text></View>

        <View style={styles.disclaimer}>
          <Text>Disclaimer: Predictions are based on previous year cutoffs and do not guarantee admission. Cutoffs shift every year. Always verify with KEA before option entry.</Text>
        </View>
        <Footer />
      </Page>

      {/* Pages 2–6: One per confidence bucket */}
      {CONFIDENCE_LIST.map((conf) => {
        const cfg = CONFIDENCE_COLORS[conf]
        return (
          <Page key={conf} size="A4" style={styles.page} orientation="landscape">
            <Header subtitle={sub} />
            <Text style={[styles.h2, { color: cfg.hex }]}>{cfg.emoji} {conf} <Text style={{ fontSize: 12, color: COLORS.muted }}>({counts[conf]} options)</Text></Text>
            <Text style={styles.sub}>
              {conf === 'Safe' && 'Cutoff is at least 20% above your rank — strong safety net. Place these high in your option list.'}
              {conf === 'High Chance' && 'Cutoff 10–20% above your rank — highly likely admission.'}
              {conf === 'Borderline' && 'Cutoff within 10% of your rank — outcome depends on the counselling round.'}
              {conf === 'Low Chance' && 'Your rank is slightly above last year cutoff — list a few of these as stretch picks.'}
              {conf === 'Not Likely' && 'Far above last year cutoff — listed for reference only.'}
            </Text>
            <ResultsTable rows={grouped[conf] || []} />
            <Footer />
          </Page>
        )
      })}

      {/* Page 7: All obtainable branches (Section B) */}
      <Page size="A4" style={styles.page} orientation="landscape">
        <Header subtitle={sub} />
        <Text style={styles.h2}>Top Colleges & All Obtainable Branches</Text>
        <Text style={styles.sub}>Every branch with a Borderline-or-better chance across all colleges. Best quota and probability shown.</Text>
        <SectionBTable rows={sectionB} />
        <Footer />
      </Page>

      {/* Page 8: Suggested KCET Option Entry Order */}
      <Page size="A4" style={styles.page} orientation="landscape">
        <Header subtitle={sub} />
        <Text style={styles.h2}>Suggested KCET Option-Entry Order</Text>
        <Text style={styles.sub}>
          KEA recommends Safe first, then High Chance, Borderline, and a few Low Chance picks at the bottom. Sorted by probability within each bucket.
        </Text>
        <OptionOrderTable rows={optionLimited} />
        <View style={styles.disclaimer}>
          <Text>Disclaimer: Predictions are based on previous year cutoffs. Always verify with KEA before final option entry.</Text>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}

export async function generateReportPdf({ input, results, grouped, sectionB }) {
  const doc = <ReportDocument input={input} results={results} grouped={grouped} sectionB={sectionB} />
  const buffer = await renderToBuffer(doc)
  return buffer
}
