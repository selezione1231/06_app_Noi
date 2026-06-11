import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, X, Search, Trash2 } from 'lucide-react'
import { WP_COLORS, wpButton, wpBadge } from '../shared/wpStyles'
import {
  WP_EMPLOYEES, WP_SITES, WP_VEHICLES, WP_CLIENTS,
  WP_ASSIGNMENTS, SPECIAL_LABELS, WP_LEAVE_REQUESTS, WP_EMP_CERTS
} from '../shared/wpSeed'
import { useSharedState } from '../../shared/ui'

// ─────────────────────────────────────────────────────────────────────────────
// WeeklyPlanner — pianificazione veloce: 2 click per assegnare
// Clic cella → popover → clic cantiere = salvato subito
// Drag sinistro → sposta  |  Tasto destro → copia su più giorni
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const SPECIAL_TYPES  = ['Ferie', 'Malattia', 'Infortunio', 'TD', 'TN', 'RD', 'RN', 'Permesso']

function getMonday(d = new Date()) {
  const t = new Date(d)
  const day = t.getDay()
  t.setDate(t.getDate() - day + (day === 0 ? -6 : 1))
  t.setHours(0, 0, 0, 0)
  return t
}
function addDays(d, n) { const t = new Date(d); t.setDate(t.getDate() + n); return t }
function toStr(d) { return d.toISOString().split('T')[0] }

// ─── color per cantiere (hash stabile sul codice) ───────────────────────────
const PALETTE = ['#e11d48','#2563eb','#059669','#d97706','#7c3aed','#0891b2','#be185d','#16a34a']
function siteColor(code = '') {
  let h = 0; for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return PALETTE[h % PALETTE.length]
}

// ─── cell rendering ──────────────────────────────────────────────────────────
function CellContent({ cell, isDragging }) {
  if (!cell) return (
    <div className="wp-cell-empty" style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '1.3rem', transition: 'color 0.12s' }}>+</div>
  )
  if (cell.special) {
    const cfg = SPECIAL_LABELS[cell.special]
    return (
      <div style={{ minHeight: '52px', padding: '6px', background: cfg?.bg || '#f1f5f9', color: cfg?.color || '#334155', borderRadius: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', opacity: isDragging ? 0.35 : 1, userSelect: 'none' }}>
        <span style={{ fontSize: '1rem' }}>{cfg?.icon}</span>
        <span>{cfg?.label || cell.special}</span>
      </div>
    )
  }
  const site = WP_SITES.find(s => s.id === cell.site_id)
  const vehicle = WP_VEHICLES.find(v => v.id === cell.vehicle_id)
  const col = siteColor(site?.code)
  return (
    <div style={{ minHeight: '52px', padding: '4px 6px', background: `${col}12`, borderRadius: '5px', borderLeft: `3px solid ${col}`, opacity: isDragging ? 0.35 : 1, userSelect: 'none', cursor: 'grab' }}>
      {site && <div style={{ fontWeight: 800, fontSize: '0.72rem', color: col }}>{site.code}</div>}
      {site && <div style={{ fontSize: '0.65rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</div>}
      {vehicle && <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '2px' }}>🚐 {vehicle.plate}</div>}
    </div>
  )
}

// ─── quick-pop (inline, centrato) ────────────────────────────────────────────
function QuickPop({ cell, weekDates, weekStrs, onSave, onDelete, onClose, onCopy }) {
  const existing = cell.assignment
  const [tab, setTab]   = useState(existing?.special ? 'special' : 'site')
  const [q, setQ]       = useState('')
  const [selSpecial, setSelSpecial] = useState(existing?.special || 'Ferie')
  const searchRef = useRef(null)
  const popRef    = useRef(null)

  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 40) }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => { if (popRef.current && !popRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [onClose])

  const emp = WP_EMPLOYEES.find(e => e.id === cell.employeeId)
  const cellDate = new Date(cell.date + 'T12:00')

  // Filtra cantieri
  const filteredSites = useMemo(() => {
    const lq = q.toLowerCase()
    if (!lq) return WP_SITES
    return WP_SITES.filter(s => {
      const cli = WP_CLIENTS.find(c => c.id === s.client_id)
      return s.code.toLowerCase().includes(lq) || s.name.toLowerCase().includes(lq) || (cli?.name.toLowerCase().includes(lq))
    })
  }, [q])

  // Salva cantiere con 1 click
  const pickSite = (siteId) => {
    onSave({ employee_id: cell.employeeId, date: cell.date, site_id: siteId, vehicle_id: null, special: null, notes: '' })
  }

  const pickSpecial = (sp) => {
    onSave({ employee_id: cell.employeeId, date: cell.date, site_id: null, vehicle_id: null, special: sp, notes: '' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
      <div
        ref={popRef}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '340px', background: 'white',
          border: `1.5px solid ${WP_COLORS.border}`, borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden',
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${WP_COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: WP_COLORS.text }}>{emp?.name}</div>
            <div style={{ fontSize: '0.7rem', color: WP_COLORS.textMuted }}>
              {cellDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {existing && (
              <button onClick={onDelete} title="Elimina assegnazione" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex', borderRadius: '4px' }}>
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: WP_COLORS.textMuted, padding: '4px', display: 'flex', borderRadius: '4px' }}><X size={16} /></button>
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${WP_COLORS.border}` }}>
          {[['site', 'Cantiere'], ['special', 'Speciale']].map(([key, lbl]) => (
            <button key={key} onClick={() => { setTab(key); if (key === 'site') setTimeout(() => searchRef.current?.focus(), 30) }}
              style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.76rem', background: tab === key ? WP_COLORS.primaryLight : 'white', color: tab === key ? WP_COLORS.primary : WP_COLORS.textMuted, borderBottom: tab === key ? `2px solid ${WP_COLORS.primary}` : '2px solid transparent', transition: 'all 0.12s' }}>
              {lbl}
            </button>
          ))}
        </div>

        {tab === 'site' ? (
          <div>
            {/* Search */}
            <div style={{ padding: '10px 12px 6px', position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: WP_COLORS.textMuted, pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cerca cantiere, codice, cliente…"
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px 7px 26px', border: `1.5px solid ${WP_COLORS.border}`, borderRadius: '7px', fontSize: '0.8rem', outline: 'none', color: WP_COLORS.text }}
              />
            </div>
            {/* Site list — click = save immediately */}
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {filteredSites.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: WP_COLORS.textMuted, fontSize: '0.78rem' }}>Nessun cantiere trovato</div>
              )}
              {filteredSites.map(site => {
                const cli = WP_CLIENTS.find(c => c.id === site.client_id)
                const col = siteColor(site.code)
                const isSelected = existing?.site_id === site.id
                return (
                  <div
                    key={site.id}
                    onClick={() => pickSite(site.id)}
                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${WP_COLORS.border}`, background: isSelected ? `${col}10` : 'transparent', transition: 'background 0.1s' }}
                    className="wp-site-row"
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.77rem', color: col, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {site.code}
                        {site.is_maintenance && <span style={{ fontSize: '0.6rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>MAN</span>}
                        {isSelected && <span style={{ fontSize: '0.6rem', background: `${col}20`, color: col, padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>✓ attivo</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: WP_COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</div>
                      {cli && <div style={{ fontSize: '0.63rem', color: WP_COLORS.textMuted }}>{cli.name}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Special chips — click = save immediately */
          <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {SPECIAL_TYPES.map(sp => {
              const cfg = SPECIAL_LABELS[sp]
              const isActive = existing?.special === sp
              return (
                <button key={sp} onClick={() => pickSpecial(sp)}
                  style={{ padding: '9px 12px', border: `1.5px solid ${isActive ? cfg?.color || '#334155' : WP_COLORS.border}`, borderRadius: '8px', cursor: 'pointer', background: isActive ? cfg?.bg || '#f1f5f9' : 'white', color: cfg?.color || '#334155', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.1s' }}>
                  <span>{cfg?.icon}</span> {cfg?.label || sp}
                </button>
              )
            })}
          </div>
        )}

        {/* Footer: hint copy */}
        {existing && (
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${WP_COLORS.border}`, background: '#fafafa' }}>
            <button onClick={onCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: WP_COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
              <span>📋</span> Copia su altri giorni…
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── copy panel ──────────────────────────────────────────────────────────────
function CopyPanel({ cell, weekDates, weekStrs, onConfirm, onClose }) {
  const [selDays, setSelDays] = useState(new Set())
  const toggle = (d) => setSelDays(prev => { const s = new Set(prev); s.has(d) ? s.delete(d) : s.add(d); return s })
  const src = cell.assignment
  const emp = WP_EMPLOYEES.find(e => e.id === cell.employeeId)
  const site = src?.site_id ? WP_SITES.find(s => s.id === src.site_id) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', width: '300px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>Copia assegnazione su…</div>
        <div style={{ fontSize: '0.73rem', color: WP_COLORS.textMuted, marginBottom: '14px' }}>
          {emp?.name} · <strong>{site?.code || src?.special}</strong>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {weekStrs.map((dateStr, i) => {
            const isSrc = dateStr === cell.date
            const sel = selDays.has(dateStr)
            const col = WP_COLORS.primary
            return (
              <button key={dateStr} disabled={isSrc} onClick={() => toggle(dateStr)}
                style={{ padding: '6px 8px', borderRadius: '7px', fontWeight: 700, fontSize: '0.73rem', cursor: isSrc ? 'default' : 'pointer', border: `1.5px solid ${sel ? col : WP_COLORS.border}`, background: isSrc ? '#f1f5f9' : sel ? `${col}12` : 'white', color: isSrc ? '#94a3b8' : sel ? col : WP_COLORS.text, opacity: isSrc ? 0.45 : 1, lineHeight: 1.3 }}>
                {WEEKDAY_LABELS[i]}<br />
                <span style={{ fontWeight: 400, fontSize: '0.62rem' }}>{weekDates[i].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
          <button onClick={onClose} style={{ ...wpButton('ghost', 'sm') }}>Annulla</button>
          <button disabled={selDays.size === 0} onClick={() => onConfirm([...selDays])}
            style={{ ...wpButton('primary', 'sm'), opacity: selDays.size === 0 ? 0.5 : 1 }}>
            {selDays.size > 0 ? `Copia su ${selDays.size} giorn${selDays.size === 1 ? 'o' : 'i'}` : 'Seleziona…'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function WeeklyPlanner({ pmId }) {
  const [weekStart, setWeekStart] = useState(() => getMonday())
  // Persistenza condivisa: la pianificazione è unica per tutta l'azienda (realtime)
  const [assignments, setAssignments] = useSharedState('wp-weekly-assignments', WP_ASSIGNMENTS)
  const [pop, setPop]     = useState(null)   // { employeeId, date, assignment }
  const [copyCell, setCopyCell] = useState(null)

  // Drag state
  const [dragging, setDragging] = useState(null)
  const [dropCell, setDropCell] = useState(null)

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekStrs  = useMemo(() => weekDates.map(toStr), [weekDates])
  const todayStr  = toStr(new Date())

  const teamEmployees = useMemo(() => (
    WP_EMPLOYEES.filter(e => e.pm_id === pmId).sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0))
  ), [pmId])

  const getCell = useCallback((empId, date) => assignments.find(a => a.employee_id === empId && a.date === date), [assignments])

  const specialsByDay = useMemo(() => weekStrs.map(d => {
    const ids = teamEmployees.map(e => e.id)
    const day = assignments.filter(a => a.date === d && ids.includes(a.employee_id))
    const counts = {}; day.forEach(a => { if (a.special) counts[a.special] = (counts[a.special] || 0) + 1 })
    return { date: d, counts, sitesCount: day.filter(a => a.site_id).length }
  }), [assignments, weekStrs, teamEmployees])

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d,  7))
  const goToday  = () => setWeekStart(getMonday())

  const fmtRange = () => {
    const s = weekDates[0].toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
    const e = weekDates[6].toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${s} → ${e}`
  }

  // ── MOTORE CONFLITTI ───────────────────────────────────────────────────────
  // Controlla un'assegnazione di cantiere prima di salvarla.
  // blocks → assegnazione impedita | warns → richiesta conferma
  const checkConflicts = useCallback((empId, date, data) => {
    const blocks = [], warns = []
    if (!data.site_id) return { blocks, warns }   // gli "speciali" non hanno vincoli
    const emp = WP_EMPLOYEES.find(e => e.id === empId)
    const fmtD = (d) => new Date(d + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

    // 1) Ferie/permessi APPROVATI che coprono la data
    const leave = WP_LEAVE_REQUESTS.find(l =>
      l.employee_id === empId && l.status === 'Approved' && date >= l.date_from && date <= l.date_to
    )
    if (leave) blocks.push(`${emp?.name} ha ${leave.type} approvate dal ${fmtD(leave.date_from)} al ${fmtD(leave.date_to)}.`)

    // 2) Giornata già pianificata come speciale (Ferie, Malattia, ecc.)
    const existing = assignments.find(a => a.employee_id === empId && a.date === date)
    if (existing?.special) {
      const cfg = SPECIAL_LABELS[existing.special]
      blocks.push(`${emp?.name} risulta "${cfg?.label || existing.special}" il ${fmtD(date)}.`)
    }

    // 3) Patentini / abilitazioni scaduti alla data dell'assegnazione
    WP_EMP_CERTS
      .filter(c => c.employee_id === empId && c.expiry < date)
      .forEach(c => blocks.push(`Patentino "${c.name}" di ${emp?.name} scaduto il ${fmtD(c.expiry)}.`))

    // 4) Già assegnato a un altro cantiere → sovrascrittura da confermare
    if (existing?.site_id && existing.site_id !== data.site_id) {
      const prevSite = WP_SITES.find(s => s.id === existing.site_id)
      warns.push(`${emp?.name} è già assegnato a ${prevSite?.code || 'altro cantiere'} il ${fmtD(date)}: verrà sostituito.`)
    }
    return { blocks, warns }
  }, [assignments])

  // true = si può procedere, false = annullato/bloccato
  const passesConflicts = useCallback((empId, date, data) => {
    const { blocks, warns } = checkConflicts(empId, date, data)
    if (blocks.length > 0) {
      window.alert('⛔ Assegnazione bloccata:\n\n• ' + blocks.join('\n• ') +
        '\n\nRimuovi prima il vincolo (ferie/patentino) per procedere.')
      return false
    }
    if (warns.length > 0) {
      return window.confirm('⚠️ Attenzione:\n\n• ' + warns.join('\n• ') + '\n\nProcedere comunque?')
    }
    return true
  }, [checkConflicts])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveAssignment = (data) => {
    if (!passesConflicts(data.employee_id, data.date, data)) return
    setAssignments(prev => {
      const idx = prev.findIndex(a => a.employee_id === data.employee_id && a.date === data.date)
      if (idx >= 0) return prev.map((a, i) => i === idx ? { ...a, ...data } : a)
      return [...prev, { ...data, id: `a-${Date.now()}` }]
    })
    setPop(null)
  }

  const deleteAssignment = (empId, date) => {
    setAssignments(prev => prev.filter(a => !(a.employee_id === empId && a.date === date)))
    setPop(null)
  }

  const copyAssignment = (srcCell, targetDates) => {
    const src = srcCell.assignment
    if (!src) return
    // Controlla i conflitti data per data: copia solo sui giorni senza blocchi
    const okDates = [], blockedMsgs = []
    targetDates.forEach(date => {
      const { blocks } = checkConflicts(srcCell.employeeId, date, src)
      if (blocks.length > 0) blockedMsgs.push(...blocks)
      else okDates.push(date)
    })
    if (blockedMsgs.length > 0) {
      window.alert('⛔ Alcuni giorni sono stati saltati:\n\n• ' + [...new Set(blockedMsgs)].join('\n• '))
    }
    if (okDates.length === 0) { setCopyCell(null); return }
    setAssignments(prev => {
      let next = [...prev]
      okDates.forEach(date => {
        const idx = next.findIndex(a => a.employee_id === srcCell.employeeId && a.date === date)
        const entry = { ...src, id: `a-${Date.now()}-${date}`, employee_id: srcCell.employeeId, date }
        if (idx >= 0) next = next.map((a, i) => i === idx ? entry : a)
        else next = [...next, entry]
      })
      return next
    })
    setCopyCell(null)
  }

  // ── DRAG & DROP ───────────────────────────────────────────────────────────
  const onDragStart = (e, empId, date, cell) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragging({ empId, date, cell })
  }
  const onDragOver = (e, empId, date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropCell({ empId, date })
  }
  const onDrop = (e, empId, date) => {
    e.preventDefault()
    if (!dragging) return
    if (dragging.empId === empId && dragging.date === date) { reset(); return }
    const data = { ...dragging.cell, employee_id: empId, date }
    if (!passesConflicts(empId, date, data)) { reset(); return }
    // remove source, upsert target
    setAssignments(prev => {
      const without = prev.filter(a => !(a.employee_id === dragging.empId && a.date === dragging.date))
      const idx = without.findIndex(a => a.employee_id === empId && a.date === date)
      const entry = { ...data, id: `a-${Date.now()}` }
      if (idx >= 0) return without.map((a, i) => i === idx ? entry : a)
      return [...without, entry]
    })
    reset()
  }
  const onDragEnd = () => reset()
  const reset = () => { setDragging(null); setDropCell(null) }

  // ── RIGHT-CLICK ───────────────────────────────────────────────────────────
  const onContextMenu = (e, empId, date, cell) => {
    e.preventDefault()
    if (!cell) return
    setCopyCell({ employeeId: empId, date, assignment: cell })
  }

  return (
    <div style={{ fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, fontStyle: 'italic', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalIcon size={20} color={WP_COLORS.primary} />
          Pianificazione Settimanale
        </h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={prevWeek} style={wpButton('primary', 'sm')}><ChevronLeft size={14} /></button>
          <div style={{ padding: '7px 13px', background: 'white', border: `1.5px solid ${WP_COLORS.primary}`, borderRadius: '8px', fontWeight: 700, fontSize: '0.84rem', color: WP_COLORS.primary }}>{fmtRange()}</div>
          <button onClick={nextWeek} style={wpButton('primary', 'sm')}><ChevronRight size={14} /></button>
          <button onClick={goToday} style={wpButton('secondary', 'sm')}>Oggi</button>
        </div>
      </div>

      {/* HINT */}
      <div style={{ marginBottom: '10px', fontSize: '0.7rem', color: WP_COLORS.textMuted, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <span>🖱️ <strong>Clic cella</strong> → assegna in 1 click</span>
        <span>↔️ <strong>Trascina</strong> blocco → sposta</span>
        <span>🖱️ <strong>Tasto destro</strong> su blocco → copia su più giorni</span>
      </div>

      {/* GRIGLIA */}
      <div style={{ overflowX: 'auto', border: `1px solid ${WP_COLORS.border}`, borderRadius: '10px', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: WP_COLORS.primary, color: 'white', padding: '10px 12px', textAlign: 'left', minWidth: '160px', zIndex: 2, fontWeight: 800 }}>
                Dipendente
              </th>
              {weekDates.map((d, i) => {
                const isToday = weekStrs[i] === todayStr
                return (
                  <th key={i} style={{ background: isToday ? '#7f1d2e' : WP_COLORS.primary, color: 'white', padding: '8px 5px', textAlign: 'center', minWidth: '108px' }}>
                    <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 600 }}>{WEEKDAY_LABELS[i]}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</div>
                    {isToday && <div style={{ fontSize: '0.58rem', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', padding: '1px 4px', marginTop: '2px' }}>OGGI</div>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {teamEmployees.map(emp => (
              <tr key={emp.id}>
                {/* Dipendente */}
                <td style={{ position: 'sticky', left: 0, background: emp.is_leader ? '#fef3c7' : 'white', padding: '8px 12px', borderRight: `1px solid ${WP_COLORS.border}`, borderBottom: `1px solid ${WP_COLORS.border}`, zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {emp.is_leader && <span style={{ background: WP_COLORS.info, color: 'white', fontSize: '0.58rem', fontWeight: 900, padding: '2px 4px', borderRadius: '3px' }}>CS</span>}
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: emp.is_leader ? WP_COLORS.info : WP_COLORS.text }}>{emp.name}</span>
                    {(() => {
                      const expired = WP_EMP_CERTS.filter(c => c.employee_id === emp.id && c.expiry < todayStr)
                      return expired.length > 0 ? (
                        <span
                          title={'Patentini scaduti:\n' + expired.map(c => `• ${c.name} (${c.expiry})`).join('\n')}
                          style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.58rem', fontWeight: 900, padding: '2px 4px', borderRadius: '3px', cursor: 'help' }}
                        >⚠ PAT.</span>
                      ) : null
                    })()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: WP_COLORS.textMuted }}>{emp.code}</div>
                </td>
                {/* Celle giorno */}
                {weekStrs.map(dateStr => {
                  const cell = getCell(emp.id, dateStr)
                  const isDrop = dropCell?.empId === emp.id && dropCell?.date === dateStr
                  const isDraggingThis = dragging?.empId === emp.id && dragging?.date === dateStr
                  return (
                    <td
                      key={dateStr}
                      onClick={() => !dragging && setPop({ employeeId: emp.id, date: dateStr, assignment: cell || null })}
                      onContextMenu={(e) => onContextMenu(e, emp.id, dateStr, cell)}
                      onDragOver={(e) => onDragOver(e, emp.id, dateStr)}
                      onDrop={(e) => onDrop(e, emp.id, dateStr)}
                      onDragLeave={() => setDropCell(null)}
                      style={{
                        padding: '4px', borderLeft: `1px solid ${WP_COLORS.border}`, borderBottom: `1px solid ${WP_COLORS.border}`,
                        verticalAlign: 'top', cursor: dragging ? 'copy' : 'pointer',
                        background: isDrop ? 'rgba(168,34,56,0.1)' : 'transparent',
                        outline: isDrop ? `2px dashed ${WP_COLORS.primary}` : 'none',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div
                        draggable={!!cell}
                        onDragStart={cell ? (e) => { e.stopPropagation(); onDragStart(e, emp.id, dateStr, cell) } : undefined}
                        onDragEnd={onDragEnd}
                      >
                        <CellContent cell={cell} isDragging={isDraggingThis} />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {/* RIEPILOGO */}
          <tfoot>
            <tr>
              <td style={{ position: 'sticky', left: 0, background: '#f1f5f9', padding: '8px 12px', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', color: WP_COLORS.textMuted, borderTop: `2px solid ${WP_COLORS.primary}`, zIndex: 1 }}>Riepilogo</td>
              {specialsByDay.map(s => (
                <td key={s.date} style={{ padding: '6px 4px', background: '#f1f5f9', borderTop: `2px solid ${WP_COLORS.primary}`, borderLeft: `1px solid ${WP_COLORS.border}`, verticalAlign: 'top' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: WP_COLORS.text }}>{s.sitesCount} cant.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                    {Object.entries(s.counts).map(([k, v]) => {
                      const cfg = SPECIAL_LABELS[k]; if (!cfg) return null
                      return <span key={k} style={wpBadge(cfg.bg, cfg.color)}>{cfg.label} {v}</span>
                    })}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* LEGENDA */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <strong style={{ color: WP_COLORS.textMuted }}>LEGENDA:</strong>
        {Object.entries(SPECIAL_LABELS).map(([k, c]) => (
          <span key={k} style={wpBadge(c.bg, c.color)}>{c.icon} {c.label}</span>
        ))}
      </div>

      {/* QUICK POP */}
      {pop && (
        <QuickPop
          cell={pop}
          weekDates={weekDates}
          weekStrs={weekStrs}
          onSave={saveAssignment}
          onDelete={() => deleteAssignment(pop.employeeId, pop.date)}
          onClose={() => setPop(null)}
          onCopy={() => { setCopyCell(pop); setPop(null) }}
        />
      )}

      {/* COPY PANEL */}
      {copyCell && (
        <CopyPanel
          cell={copyCell}
          weekDates={weekDates}
          weekStrs={weekStrs}
          onConfirm={(dates) => copyAssignment(copyCell, dates)}
          onClose={() => setCopyCell(null)}
        />
      )}

      <style>{`
        .wp-cell-empty { color: #e2e8f0 !important; }
        tr:hover .wp-cell-empty { color: #cbd5e1 !important; }
        .wp-site-row:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  )
}
