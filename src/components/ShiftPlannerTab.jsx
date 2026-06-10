import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, X, Trash2, Search } from 'lucide-react'

const DEMO_COMMESSE = [
  { id: 'c1', code: 'INT-001', label: 'Sede Centrale Milano',        client: 'Interno',          color: '#3b82f6' },
  { id: 'c2', code: 'CLI-045', label: 'Cantiere Roma EUR',            client: 'Costruzioni SpA',  color: '#f59e0b' },
  { id: 'c3', code: 'CLI-046', label: 'Magazzino Bergamo',            client: 'LogiTrans Srl',    color: '#10b981' },
  { id: 'c4', code: 'CLI-047', label: 'Manutenzione Impianti',        client: 'IndustriaX SpA',   color: '#8b5cf6' },
  { id: 'c5', code: 'INT-002', label: 'Formazione interna',           client: 'Interno',          color: '#ec4899' },
  { id: 'c6', code: 'CLI-048', label: 'Presidio Ospedale Sud',        client: 'Sanità Srl',       color: '#f97316' },
  { id: 'c7', code: 'CLI-049', label: 'Evento Fiera Milano',          client: 'ExpoGroup',        color: '#06b6d4' },
  { id: 'c8', code: 'INT-003', label: 'Reperibilità / Pronto interv.', client: 'Interno',         color: '#ef4444' },
  { id: 'c9', code: 'CLI-050', label: 'Vigilanza Notturna Centro',    client: 'CentroComm SpA',   color: '#64748b' },
  { id: 'c10',code: 'CLI-051', label: 'Portierato Palazzo Uffici',    client: 'ImmobiliareX',     color: '#a16207' },
]

const PRESETS = [
  { type: 'Mattina',    short: 'M', start: '08:00', end: '16:00', color: '#3b82f6' },
  { type: 'Pomeriggio', short: 'P', start: '14:00', end: '22:00', color: '#f59e0b' },
  { type: 'Notte',      short: 'N', start: '22:00', end: '06:00', color: '#8b5cf6' },
  { type: 'Custom',     short: 'C', start: '',       end: '',       color: '#10b981' },
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  let [eh, em] = end.split(':').map(Number)
  if (eh < sh || (eh === sh && em < sm)) eh += 24
  return parseFloat(((eh * 60 + em - sh * 60 - sm) / 60).toFixed(1))
}

export default function ShiftPlannerTab({ employees = [], shifts = [], leaves = [], onSaveShift, onDeleteShift }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  // Inline popover
  const [pop, setPop] = useState(null)       // { empId, dateStr, editShift | null }
  const [query, setQuery] = useState('')
  const [selCommessa, setSelCommessa] = useState(null)
  const [selType, setSelType] = useState('Mattina')
  const [selStart, setSelStart] = useState('08:00')
  const [selEnd, setSelEnd] = useState('16:00')
  const [showDrop, setShowDrop] = useState(false)
  const searchRef = useRef(null)
  const popRef = useRef(null)

  // Drag
  const [dragging, setDragging] = useState(null)   // shift object
  const [dropCell, setDropCell] = useState(null)   // { empId, dateStr }

  // Copy panel
  const [copyPanel, setCopyPanel] = useState(null) // { shift, days: Set }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekStrs  = weekDates.map(toDateStr)

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(getMonday(new Date()))

  const fmtRange = () => {
    const opt = { day: 'numeric', month: 'short' }
    return `${weekDates[0].toLocaleDateString('it-IT', opt)} – ${weekDates[6].toLocaleDateString('it-IT', { ...opt, year: 'numeric' })}`
  }

  const todayStr = toDateStr(new Date())

  // --- data helpers ---
  const getDayShifts = (empId, dateStr) => shifts.filter(s => s.employee_id === empId && s.shift_date === dateStr)
  const getDayLeave  = (empId, dateStr) => leaves.find(l => l.employee_id === empId && (l.status === 'Approved' || l.status === 'Pending') && dateStr >= l.start_date && dateStr <= l.end_date)
  const weekHours    = (empId) => {
    let h = 0
    shifts.forEach(s => { if (s.employee_id === empId && weekStrs.includes(s.shift_date)) h += calcHours(s.start_time, s.end_time) })
    return parseFloat(h.toFixed(1))
  }

  const getCommessa = (id) => DEMO_COMMESSE.find(c => c.id === id)
  const filtered = query.length
    ? DEMO_COMMESSE.filter(c => `${c.code} ${c.label} ${c.client}`.toLowerCase().includes(query.toLowerCase()))
    : DEMO_COMMESSE

  // --- popover open ---
  const openPop = (empId, dateStr, editShift = null) => {
    if (editShift) {
      const c = getCommessa(editShift.commessa_id)
      setSelCommessa(c || null)
      setQuery(c ? `${c.code} — ${c.label}` : (editShift.notes || ''))
      setSelType(editShift.shift_type || 'Mattina')
      setSelStart(editShift.start_time)
      setSelEnd(editShift.end_time)
    } else {
      setSelCommessa(null)
      setQuery('')
      setSelType('Mattina')
      setSelStart('08:00')
      setSelEnd('16:00')
    }
    setShowDrop(false)
    setPop({ empId, dateStr, editShift })
    setTimeout(() => searchRef.current?.focus(), 40)
  }

  const closePop = () => { setPop(null); setShowDrop(false) }

  const pickPreset = (p) => {
    setSelType(p.type)
    if (p.type !== 'Custom') { setSelStart(p.start); setSelEnd(p.end) }
  }

  const pickCommessa = (c) => {
    setSelCommessa(c)
    setQuery(`${c.code} — ${c.label}`)
    setShowDrop(false)
    setTimeout(() => searchRef.current?.blur(), 10)
  }

  const savePop = async () => {
    if (!pop) return
    const emp = employees.find(e => e.id === pop.empId)
    if (!emp) return
    const data = {
      employee_id: pop.empId,
      employee_name: emp.name,
      shift_date: pop.dateStr,
      start_time: selStart,
      end_time: selEnd,
      shift_type: selType,
      commessa_id: selCommessa?.id || null,
      commessa_label: selCommessa ? `${selCommessa.code} — ${selCommessa.label}` : (query || null),
      notes: selCommessa ? `${selCommessa.code} — ${selCommessa.label}` : (query || null),
    }
    if (pop.editShift) data.id = pop.editShift.id
    await onSaveShift(data)
    closePop()
  }

  const deletePop = async () => {
    if (!pop?.editShift) return
    await onDeleteShift(pop.editShift.id)
    closePop()
  }

  // close on ESC / outside click
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { closePop(); setCopyPanel(null) } }
    const onDown = (e) => { if (popRef.current && !popRef.current.contains(e.target)) closePop() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [])

  // --- drag & drop ---
  const onDragStart = (e, shift) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragging(shift)
  }
  const onDragOver = (e, empId, dateStr) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropCell({ empId, dateStr })
  }
  const onDrop = async (e, empId, dateStr) => {
    e.preventDefault()
    if (!dragging) return
    if (dragging.employee_id === empId && dragging.shift_date === dateStr) { setDragging(null); setDropCell(null); return }
    const emp = employees.find(x => x.id === empId)
    await onSaveShift({ ...dragging, employee_id: empId, employee_name: emp?.name || dragging.employee_name, shift_date: dateStr })
    setDragging(null); setDropCell(null)
  }
  const onDragEnd = () => { setDragging(null); setDropCell(null) }

  // --- right-click copy ---
  const onContextMenu = (e, shift) => {
    e.preventDefault()
    e.stopPropagation()
    setCopyPanel({ shift, days: new Set() })
  }
  const toggleDay = (dateStr) => setCopyPanel(p => {
    if (!p) return null
    const d = new Set(p.days)
    d.has(dateStr) ? d.delete(dateStr) : d.add(dateStr)
    return { ...p, days: d }
  })
  const confirmCopy = async () => {
    if (!copyPanel) return
    for (const dateStr of copyPanel.days) {
      const emp = employees.find(e => e.id === copyPanel.shift.employee_id)
      await onSaveShift({ ...copyPanel.shift, id: undefined, shift_date: dateStr, employee_name: emp?.name || copyPanel.shift.employee_name })
    }
    setCopyPanel(null)
  }

  // --- shift block color ---
  const shiftColor = (shift) => {
    const c = getCommessa(shift.commessa_id)
    if (c) return c.color
    return PRESETS.find(p => p.type === shift.shift_type)?.color || '#6b7280'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'var(--bg-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
          Pianificazione Settimanale
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="btn btn-secondary" style={{ padding: '5px 9px' }} onClick={prevWeek}><ChevronLeft size={15} /></button>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: '195px', textAlign: 'center' }}>{fmtRange()}</span>
          <button className="btn btn-secondary" style={{ padding: '5px 9px' }} onClick={nextWeek}><ChevronRight size={15} /></button>
          <button className="btn btn-secondary" style={{ padding: '5px 11px', fontSize: '0.73rem', fontWeight: 700 }} onClick={goToday}>Oggi</button>
        </div>
      </div>

      {/* ── Hint bar ── */}
      <div style={{ padding: '5px 16px', background: 'rgba(168,34,56,0.04)', borderBottom: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '18px', flexShrink: 0 }}>
        <span><strong>Clic cella</strong> → assegna commessa</span>
        <span><strong>Trascina</strong> blocco → sposta</span>
        <span><strong>Tasto destro</strong> su blocco → copia su altri giorni</span>
      </div>

      {/* ── Grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '860px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ width: '150px', padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800 }}>Dipendente</th>
              <th style={{ width: '48px', padding: '8px 4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800 }}>Ore</th>
              {weekDates.map((date, i) => {
                const isToday = weekStrs[i] === todayStr
                return (
                  <th key={i} style={{ padding: '6px 3px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, borderLeft: '1px solid var(--border-color)', background: isToday ? 'rgba(168,34,56,0.07)' : 'var(--bg-card)' }}>
                    <div style={{ fontWeight: 800, color: isToday ? 'var(--primary)' : 'var(--text-primary)' }}>{DAYS[i]}</div>
                    <div style={{ fontSize: '0.63rem', fontWeight: 500, color: isToday ? 'var(--primary)' : 'var(--text-muted)', marginTop: '1px' }}>
                      {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Nessun dipendente — aggiungine nel tab Dipendenti.
              </td></tr>
            ) : employees.map(emp => {
              const wh = weekHours(emp.id)
              const over = wh > 40
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {/* Name */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.63rem', color: 'var(--text-secondary)' }}>{emp.role}</div>
                  </td>
                  {/* Hours */}
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: over ? 'var(--danger)' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      {wh}h{over && <AlertTriangle size={9} />}
                    </span>
                  </td>
                  {/* Day cells */}
                  {weekStrs.map((dateStr, di) => {
                    const dayShifts = getDayShifts(emp.id, dateStr)
                    const leave = getDayLeave(emp.id, dateStr)
                    const isTarget = dropCell?.empId === emp.id && dropCell?.dateStr === dateStr
                    const isToday = dateStr === todayStr
                    return (
                      <td
                        key={di}
                        onClick={() => !dragging && openPop(emp.id, dateStr)}
                        onDragOver={(e) => onDragOver(e, emp.id, dateStr)}
                        onDrop={(e) => onDrop(e, emp.id, dateStr)}
                        onDragLeave={() => setDropCell(null)}
                        style={{
                          borderLeft: '1px solid var(--border-color)',
                          padding: '4px 3px',
                          verticalAlign: 'top',
                          minHeight: '60px',
                          cursor: dragging ? 'copy' : 'pointer',
                          background: isTarget ? 'rgba(168,34,56,0.12)' : isToday ? 'rgba(168,34,56,0.03)' : leave ? 'rgba(0,0,0,0.015)' : 'transparent',
                          outline: isTarget ? '2px dashed var(--primary)' : 'none',
                          transition: 'background 0.1s',
                          position: 'relative',
                        }}
                      >
                        {/* Leave badge */}
                        {leave && (
                          <div style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', marginBottom: '3px', textAlign: 'center', background: leave.type === 'Ferie' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: leave.type === 'Ferie' ? '#059669' : '#dc2626', border: `1px dashed ${leave.type === 'Ferie' ? '#059669' : '#dc2626'}` }}>
                            {leave.type === 'Ferie' ? '🏖' : leave.type === 'Malattia' ? '🤒' : '🏠'} {leave.type.slice(0, 3)}
                          </div>
                        )}

                        {/* Shift blocks */}
                        {dayShifts.map(shift => {
                          const col = shiftColor(shift)
                          const comm = getCommessa(shift.commessa_id)
                          const isDrag = dragging?.id === shift.id
                          return (
                            <div
                              key={shift.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); onDragStart(e, shift) }}
                              onDragEnd={onDragEnd}
                              onContextMenu={(e) => onContextMenu(e, shift)}
                              onClick={(e) => { e.stopPropagation(); openPop(emp.id, dateStr, shift) }}
                              title={`${comm ? comm.label : shift.shift_type} · ${shift.start_time}–${shift.end_time}\nClic → modifica  |  Tasto destro → copia`}
                              style={{
                                background: `${col}15`,
                                border: `1.5px solid ${col}45`,
                                borderLeft: `3px solid ${col}`,
                                borderRadius: '4px',
                                padding: '3px 4px',
                                marginBottom: '3px',
                                cursor: 'grab',
                                opacity: isDrag ? 0.35 : 1,
                                transition: 'opacity 0.12s',
                                userSelect: 'none',
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: '0.66rem', color: col, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {comm ? comm.code : shift.shift_type}
                              </div>
                              <div style={{ fontSize: '0.59rem', color: 'var(--text-muted)' }}>
                                {shift.start_time}–{shift.end_time}
                              </div>
                              {comm && (
                                <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {comm.client}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Empty cell hint */}
                        {dayShifts.length === 0 && !leave && (
                          <div className="cell-hint" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: '1.2rem', color: 'rgba(168,34,56,0.18)', opacity: 0, transition: 'opacity 0.15s' }}>+</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════
          INLINE POPOVER — assegna commessa
      ══════════════════════════════════ */}
      {pop && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div
            ref={popRef}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '310px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              padding: '16px',
              zIndex: 201,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                {employees.find(e => e.id === pop.empId)?.name}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  {new Date(pop.dateStr + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <button onClick={closePop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}><X size={15} /></button>
            </div>

            {/* Commessa search */}
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.04em' }}>COMMESSA</div>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Cerca per codice, cliente, nome..."
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDrop(true); if (!e.target.value) setSelCommessa(null) }}
                  onFocus={() => setShowDrop(true)}
                  onKeyDown={e => { if (e.key === 'Enter' && filtered.length > 0) { pickCommessa(filtered[0]); e.preventDefault() } }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px 7px 28px', border: `1.5px solid ${selCommessa ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
              {showDrop && filtered.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,0.13)', zIndex: 10, maxHeight: '190px', overflowY: 'auto' }}>
                  {filtered.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={(e) => { e.preventDefault(); pickCommessa(c) }}
                      style={{ padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', background: selCommessa?.id === c.id ? 'var(--primary-light)' : 'transparent' }}
                      className="pop-opt"
                    >
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.code} — {c.label}</div>
                        <div style={{ fontSize: '0.63rem', color: 'var(--text-secondary)' }}>{c.client}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preset chips */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', letterSpacing: '0.04em' }}>TURNO</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {PRESETS.map(p => {
                  const active = selType === p.type
                  return (
                    <button
                      key={p.type}
                      onClick={() => pickPreset(p)}
                      style={{ flex: 1, padding: '6px 3px', border: `1.5px solid ${active ? p.color : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', background: active ? `${p.color}18` : 'transparent', color: active ? p.color : 'var(--text-secondary)', fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer', lineHeight: 1.3 }}
                    >
                      {p.short}
                      <br />
                      <span style={{ fontWeight: 400, fontSize: '0.59rem', display: 'block' }}>{p.start || '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time inputs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[['INIZIO', selStart, setSelStart], ['FINE', selEnd, setSelEnd]].map(([lbl, val, setter]) => (
                <div key={lbl} style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>{lbl}</div>
                  <input
                    type="time"
                    value={val}
                    onChange={e => setter(e.target.value)}
                    disabled={selType !== 'Custom'}
                    style={{ width: '100%', padding: '6px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.8rem', opacity: selType !== 'Custom' ? 0.5 : 1 }}
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {pop.editShift
                ? <button onClick={deletePop} style={{ padding: '7px 11px', background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={12} />Elimina</button>
                : <div />
              }
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={closePop} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Annulla</button>
                <button onClick={savePop} style={{ padding: '7px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          COPY PANEL — tasto destro
      ══════════════════════════════════ */}
      {copyPanel && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setCopyPanel(null)}
        >
          <div
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', width: '290px', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '3px' }}>Copia turno su altri giorni</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Seleziona i giorni in cui replicare&nbsp;
              <strong>{getCommessa(copyPanel.shift.commessa_id)?.code || copyPanel.shift.shift_type}</strong>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {weekStrs.map((dateStr, i) => {
                const isSrc = dateStr === copyPanel.shift.shift_date
                const sel = copyPanel.days.has(dateStr)
                return (
                  <button
                    key={dateStr}
                    disabled={isSrc}
                    onClick={() => toggleDay(dateStr)}
                    style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.73rem', cursor: isSrc ? 'default' : 'pointer', border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border-color)'}`, background: isSrc ? 'rgba(0,0,0,0.04)' : sel ? 'var(--primary-light)' : 'transparent', color: isSrc ? 'var(--text-muted)' : sel ? 'var(--primary)' : 'var(--text-primary)', opacity: isSrc ? 0.4 : 1, lineHeight: 1.3 }}
                  >
                    {DAYS[i]}<br />
                    <span style={{ fontWeight: 400, fontSize: '0.62rem' }}>{weekDates[i].toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
              <button onClick={() => setCopyPanel(null)} style={{ padding: '7px 13px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Annulla</button>
              <button
                onClick={confirmCopy}
                disabled={copyPanel.days.size === 0}
                style={{ padding: '7px 15px', background: copyPanel.days.size === 0 ? '#ccc' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: copyPanel.days.size === 0 ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
              >
                {copyPanel.days.size > 0 ? `Copia su ${copyPanel.days.size} giorn${copyPanel.days.size === 1 ? 'o' : 'i'}` : 'Seleziona giorni'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        td:hover .cell-hint { opacity: 1 !important; }
        .pop-opt:hover { background: rgba(168,34,56,0.05) !important; }
      `}</style>
    </div>
  )
}
