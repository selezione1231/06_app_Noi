import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, LineChart, ShieldCheck, Sparkles, TrendingUp, TrendingDown,
  HardHat, Clock, AlertTriangle, CheckCircle2, Users2, RefreshCw, Briefcase
} from 'lucide-react'
import {
  ModulePage, ModuleHeader, TabBar, StatGrid, Card, TableWrap, THead, tdStyle,
  Pill, ProgressBar, fmtEuro, fmtNum
} from '../shared/ui'

// ============================================================================
// InsightsDashboards — Dashboard direzionali
// Viste: Operations | Costi & margini | HSE | Executive briefing
// Grafici realizzati in puro CSS (barre e donut conic-gradient): zero dipendenze.
// ============================================================================

const TABS = [
  { id: 'ops',  label: 'Operations',        icon: Activity },
  { id: 'cost', label: 'Costi & margini',   icon: LineChart },
  { id: 'hse',  label: 'HSE',               icon: ShieldCheck },
  { id: 'exec', label: 'Executive briefing',icon: Sparkles }
]

// --- Demo data ------------------------------------------------------------
const WEEKLY_HOURS = [
  { week: 'Sett. 19', hours: 1240, billable: 1080 },
  { week: 'Sett. 20', hours: 1310, billable: 1150 },
  { week: 'Sett. 21', hours: 1185, billable: 990 },
  { week: 'Sett. 22', hours: 1390, billable: 1260 },
  { week: 'Sett. 23', hours: 1420, billable: 1305 }
]

const SITES_PROGRESS = [
  { code: 'BG24043', name: 'FTTH Bergamo — Lotto 3',      pct: 72, squads: 2, status: 'In linea' },
  { code: 'BS25124', name: 'Backbone Brescia Sud',        pct: 48, squads: 1, status: 'In ritardo' },
  { code: 'MI25201', name: 'Citofonia Milano — Adriano',  pct: 31, squads: 1, status: 'In linea' },
  { code: 'VR25080', name: 'FWA Verona — Siti collinari', pct: 100, squads: 0, status: 'Completato' }
]

const COST_BREAKDOWN = [
  { label: 'Manodopera', value: 147700, color: '#d90429' },
  { label: 'Materiali',  value: 73850,  color: '#2563eb' },
  { label: 'Mezzi & noleggi', value: 39600, color: '#d97706' },
  { label: 'Subappalti', value: 22400,  color: '#7c3aed' },
  { label: 'Generali',   value: 18900,  color: '#64748b' }
]

const MONTHLY_MARGIN = [
  { month: 'Gen', revenue: 64000, cost: 52800 },
  { month: 'Feb', revenue: 59000, cost: 50100 },
  { month: 'Mar', revenue: 71000, cost: 56900 },
  { month: 'Apr', revenue: 68000, cost: 58400 },
  { month: 'Mag', revenue: 76000, cost: 60300 },
  { month: 'Giu', revenue: 38000, cost: 30200 }
]

const HSE_MONTHLY = [
  { month: 'Gen', nearmiss: 2, injuries: 0 },
  { month: 'Feb', nearmiss: 1, injuries: 0 },
  { month: 'Mar', nearmiss: 3, injuries: 1 },
  { month: 'Apr', nearmiss: 2, injuries: 0 },
  { month: 'Mag', nearmiss: 4, injuries: 1 },
  { month: 'Giu', nearmiss: 1, injuries: 0 }
]

// --- Mini chart components (CSS only) ----------------------------------------
function BarChart({ data, maxValue, bars, height = 140 }) {
  // data: [{ label, ...values }], bars: [{ key, color, label }]
  const max = maxValue || Math.max(...data.flatMap(d => bars.map(b => Number(d[b.key]) || 0)), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4%', height, padding: '0 4px' }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}>
            {bars.map(b => {
              const v = Number(d[b.key]) || 0
              return (
                <div key={b.key} title={`${d.label} — ${b.label}: ${fmtNum(v)}`} style={{
                  width: `${Math.max(10, 28 / bars.length)}px`,
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? 3 : 0,
                  background: b.color, borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }} />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4%', padding: '6px 4px 0', borderTop: '1px solid var(--border-color)' }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {d.label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {bars.map(b => (
          <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} /> {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Donut({ segments, size = 150 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  let acc = 0
  const stops = segments.map(s => {
    const from = (acc / total) * 360
    acc += s.value
    const to = (acc / total) * 360
    return `${s.color} ${from}deg ${to}deg`
  }).join(', ')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${stops})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: size * 0.62, height: size * 0.62, borderRadius: '50%',
          background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtEuro(total)}</span>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>totale</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
            <strong style={{ color: 'var(--text-primary)' }}>{fmtEuro(s.value)}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', width: 38, textAlign: 'right' }}>
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InsightsDashboards({ view = 'ops' }) {
  const [tab, setTab] = useState(view)
  useEffect(() => { setTab(view) }, [view])
  const [briefingKey, setBriefingKey] = useState(0)

  // --- KPI ------------------------------------------------------------------
  const opsStats = useMemo(() => {
    const last = WEEKLY_HOURS[WEEKLY_HOURS.length - 1]
    const billPct = (last.billable / last.hours) * 100
    return [
      { label: 'Cantieri attivi', value: SITES_PROGRESS.filter(s => s.pct < 100).length, icon: HardHat, color: '#2563eb' },
      { label: 'Ore ultima sett.', value: fmtNum(last.hours), icon: Clock, color: '#7c3aed' },
      { label: '% ore fatturabili', value: billPct.toFixed(0) + '%', icon: TrendingUp, color: billPct >= 85 ? '#16a34a' : '#d97706' },
      { label: 'Cantieri in ritardo', value: SITES_PROGRESS.filter(s => s.status === 'In ritardo').length, icon: AlertTriangle, color: '#ef4444' }
    ]
  }, [])

  const costStats = useMemo(() => {
    const rev = MONTHLY_MARGIN.reduce((a, m) => a + m.revenue, 0)
    const cost = MONTHLY_MARGIN.reduce((a, m) => a + m.cost, 0)
    const margin = rev - cost
    return [
      { label: 'Ricavi YTD', value: fmtEuro(rev), icon: TrendingUp, color: '#16a34a' },
      { label: 'Costi YTD', value: fmtEuro(cost), icon: TrendingDown, color: '#d90429' },
      { label: 'Margine YTD', value: fmtEuro(margin), icon: LineChart, color: margin >= 0 ? '#16a34a' : '#ef4444' },
      { label: 'Margine %', value: ((margin / rev) * 100).toFixed(1) + '%', icon: LineChart, color: '#7c3aed' }
    ]
  }, [])

  const hseStats = useMemo(() => {
    const nearmiss = HSE_MONTHLY.reduce((a, m) => a + m.nearmiss, 0)
    const injuries = HSE_MONTHLY.reduce((a, m) => a + m.injuries, 0)
    return [
      { label: 'Near miss YTD', value: nearmiss, icon: AlertTriangle, color: '#d97706' },
      { label: 'Infortuni YTD', value: injuries, icon: AlertTriangle, color: injuries > 0 ? '#ef4444' : '#16a34a' },
      { label: 'Giorni senza infortuni', value: 18, icon: CheckCircle2, color: '#16a34a' },
      { label: 'Formazione in scadenza', value: 3, icon: Users2, color: '#d97706' }
    ]
  }, [])

  // --- Executive briefing (generato dai dati demo) ----------------------------
  const briefing = useMemo(() => {
    const rev = MONTHLY_MARGIN.reduce((a, m) => a + m.revenue, 0)
    const cost = MONTHLY_MARGIN.reduce((a, m) => a + m.cost, 0)
    const marginPct = ((rev - cost) / rev) * 100
    const late = SITES_PROGRESS.filter(s => s.status === 'In ritardo')
    const lastWeek = WEEKLY_HOURS[WEEKLY_HOURS.length - 1]
    const prevWeek = WEEKLY_HOURS[WEEKLY_HOURS.length - 2]
    const hoursDelta = ((lastWeek.hours - prevWeek.hours) / prevWeek.hours) * 100
    return {
      generated: new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' }),
      paragraphs: [
        `L'azienda ha generato ricavi YTD per ${fmtEuro(rev)} con un margine complessivo del ${marginPct.toFixed(1)}%, in linea con il target annuale del 18%. Il mese di maggio è stato il migliore del semestre (${fmtEuro(76000)} di ricavi).`,
        `Sul fronte operativo le ore lavorate nell'ultima settimana sono ${fmtNum(lastWeek.hours)} (${hoursDelta >= 0 ? '+' : ''}${hoursDelta.toFixed(1)}% sulla settimana precedente), con una quota fatturabile del ${((lastWeek.billable / lastWeek.hours) * 100).toFixed(0)}%.`,
        late.length > 0
          ? `Attenzione: ${late.length === 1 ? 'il cantiere' : 'i cantieri'} ${late.map(s => s.code).join(', ')} ${late.length === 1 ? 'risulta' : 'risultano'} in ritardo sul cronoprogramma. La commessa BS25124 presenta anche uno sforamento del budget manodopera (+9%): si consiglia un riallineamento con il PM entro la settimana.`
          : 'Tutti i cantieri sono in linea con il cronoprogramma.',
        'HSE: un infortunio lieve a maggio (prognosi 5 giorni) e trend near miss in calo a giugno. Tre certificazioni di formazione sicurezza scadono entro 30 giorni: pianificare i rinnovi con HR.'
      ],
      highlights: [
        { icon: TrendingUp, color: '#16a34a', text: `Margine YTD ${marginPct.toFixed(1)}% — sopra target` },
        { icon: AlertTriangle, color: '#ef4444', text: 'BS25124 in ritardo e oltre budget manodopera' },
        { icon: Briefcase, color: '#2563eb', text: '2 RDA in attesa di approvazione direzione' },
        { icon: ShieldCheck, color: '#d97706', text: '3 formazioni sicurezza da rinnovare entro 30 gg' }
      ]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingKey])

  return (
    <ModulePage>
      <ModuleHeader
        icon={Activity}
        title="Insights — Dashboard"
        subtitle="KPI operativi, economici e di sicurezza per la direzione."
        actions={tab === 'exec' && (
          <button className="btn btn-secondary" onClick={() => setBriefingKey(k => k + 1)}>
            <RefreshCw size={14} /> Rigenera briefing
          </button>
        )}
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ===== OPERATIONS ===== */}
      {tab === 'ops' && (
        <div>
          <StatGrid stats={opsStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Ore lavorate per settimana</h3>
              <BarChart
                data={WEEKLY_HOURS.map(w => ({ label: w.week, hours: w.hours, billable: w.billable }))}
                bars={[
                  { key: 'hours', color: 'var(--border-color)', label: 'Ore totali' },
                  { key: 'billable', color: '#d90429', label: 'Ore fatturabili' }
                ]}
              />
            </Card>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Avanzamento cantieri</h3>
              {SITES_PROGRESS.map(s => (
                <div key={s.code} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.code} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{s.name}</span></span>
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <Pill
                        color={s.status === 'Completato' ? '#16a34a' : s.status === 'In ritardo' ? '#ef4444' : '#2563eb'}
                        bg={s.status === 'Completato' ? 'rgba(22,163,74,0.12)' : s.status === 'In ritardo' ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.12)'}
                      >{s.status}</Pill>
                      <strong>{s.pct}%</strong>
                    </span>
                  </div>
                  <ProgressBar pct={s.pct} color={s.status === 'In ritardo' ? '#ef4444' : s.pct === 100 ? '#16a34a' : 'var(--primary)'} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ===== COSTI & MARGINI ===== */}
      {tab === 'cost' && (
        <div>
          <StatGrid stats={costStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Ricavi vs costi per mese</h3>
              <BarChart
                data={MONTHLY_MARGIN.map(m => ({ label: m.month, revenue: m.revenue, cost: m.cost }))}
                bars={[
                  { key: 'revenue', color: '#16a34a', label: 'Ricavi' },
                  { key: 'cost', color: '#d90429', label: 'Costi' }
                ]}
              />
            </Card>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Ripartizione costi YTD</h3>
              <Donut segments={COST_BREAKDOWN} />
            </Card>
          </div>
        </div>
      )}

      {/* ===== HSE ===== */}
      {tab === 'hse' && (
        <div>
          <StatGrid stats={hseStats} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Eventi per mese</h3>
              <BarChart
                data={HSE_MONTHLY.map(m => ({ label: m.month, nearmiss: m.nearmiss, injuries: m.injuries }))}
                bars={[
                  { key: 'nearmiss', color: '#d97706', label: 'Near miss' },
                  { key: 'injuries', color: '#ef4444', label: 'Infortuni' }
                ]}
              />
            </Card>
            <Card style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>Conformità</h3>
              {[
                { label: 'Visite mediche in corso di validità', pct: 84 },
                { label: 'Formazione sicurezza valida', pct: 91 },
                { label: 'DPI non scaduti', pct: 78 },
                { label: 'DVR aggiornati', pct: 100 }
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <strong style={{ color: row.pct >= 90 ? '#16a34a' : row.pct >= 75 ? '#d97706' : '#ef4444' }}>{row.pct}%</strong>
                  </div>
                  <ProgressBar pct={row.pct} color={row.pct >= 90 ? '#16a34a' : row.pct >= 75 ? '#d97706' : '#ef4444'} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ===== EXECUTIVE BRIEFING ===== */}
      {tab === 'exec' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 18 }}>
            {briefing.highlights.map((h, i) => {
              const Icon = h.icon
              return (
                <Card key={i} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} style={{ color: h.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{h.text}</span>
                </Card>
              )
            })}
          </div>

          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Briefing direzionale</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Generato il {briefing.generated}</span>
            </div>
            {briefing.paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize: '0.86rem', lineHeight: 1.65, color: 'var(--text-secondary)', margin: '0 0 12px' }}>{p}</p>
            ))}
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '14px 0 0', fontStyle: 'italic' }}>
              Sintesi generata automaticamente dai dati di Operations, Job costing, Buying e HSE.
            </p>
          </Card>
        </div>
      )}
    </ModulePage>
  )
}
