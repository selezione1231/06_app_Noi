import React, { useState, useEffect } from 'react'
import { Calendar, Clock, AlertTriangle, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react'

export default function ShiftPlannerTab({ 
  employees = [], 
  shifts = [], 
  leaves = [], 
  onSaveShift, 
  onDeleteShift 
}) {
  // Anchoring week starting Monday
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)

  // Modal form states
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState('Mattina')
  const [formStartTime, setFormStartTime] = useState('08:00')
  const [formEndTime, setFormEndTime] = useState('16:00')
  const [formNotes, setFormNotes] = useState('')

  // Autofill shift times based on selection
  useEffect(() => {
    if (formType === 'Mattina') {
      setFormStartTime('08:00')
      setFormEndTime('16:00')
    } else if (formType === 'Pomeriggio') {
      setFormStartTime('14:00')
      setFormEndTime('22:00')
    } else if (formType === 'Notte') {
      setFormStartTime('22:00')
      setFormEndTime('06:00')
    }
  }, [formType])

  // Get Monday to Sunday dates for the selected week
  const getWeekDates = (start) => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const weekDates = getWeekDates(currentWeekStart)
  const weekDatesStr = weekDates.map(d => d.toISOString().split('T')[0])

  const WEEK_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() - 7)
      return d
    })
  }

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() + 7)
      return d
    })
  }

  const handleGoToToday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  // Get shifts assigned to an employee on a specific date string (YYYY-MM-DD)
  const getDayShifts = (employeeId, dateStr) => {
    return shifts.filter(s => s.employee_id === employeeId && s.shift_date === dateStr)
  }

  // Check if employee has an approved/pending leave on a specific date string
  const getDayLeave = (employeeId, dateStr) => {
    return leaves.find(l => {
      if (l.employee_id !== employeeId) return false
      // Leave must be approved or pending
      if (l.status !== 'Approved' && l.status !== 'Pending') return false
      return dateStr >= l.start_date && dateStr <= l.end_date
    })
  }

  // Calculate shift duration in hours
  const calculateShiftHours = (start, end) => {
    if (!start || !end) return 0
    const [sHour, sMin] = start.split(':').map(Number)
    let [eHour, eMin] = end.split(':').map(Number)
    
    // Support night shift hours wrapping past midnight
    if (eHour < sHour || (eHour === sHour && eMin < sMin)) {
      eHour += 24
    }
    
    const diffMins = (eHour * 60 + eMin) - (sHour * 60 + sMin)
    return parseFloat((diffMins / 60).toFixed(1))
  }

  // Calculate total weekly hours for an employee
  const getWeeklyHours = (employeeId) => {
    let total = 0
    shifts.forEach(s => {
      if (s.employee_id === employeeId && weekDatesStr.includes(s.shift_date)) {
        total += calculateShiftHours(s.start_time, s.end_time)
      }
    })
    return total
  }

  // Open modal for creation
  const handleOpenAddModal = (employeeId = '', dateStr = '') => {
    if (employees.length === 0) {
      alert("Nessun dipendente disponibile. Aggiungi personale nel tab Dipendenti.")
      return
    }
    setEditingShift(null)
    setFormEmployeeId(employeeId || employees[0].id)
    setFormDate(dateStr || new Date().toISOString().split('T')[0])
    setFormType('Mattina')
    setFormStartTime('08:00')
    setFormEndTime('16:00')
    setFormNotes('')
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEditModal = (shift, e) => {
    e.stopPropagation()
    setEditingShift(shift)
    setFormEmployeeId(shift.employee_id)
    setFormDate(shift.shift_date)
    setFormType(shift.shift_type)
    setFormStartTime(shift.start_time)
    setFormEndTime(shift.end_time)
    setFormNotes(shift.notes || '')
    setIsModalOpen(true)
  }

  // Handle shift save
  const handleSubmitShift = async (e) => {
    e.preventDefault()
    if (!formEmployeeId || !formDate || !formStartTime || !formEndTime) return

    const selectedEmp = employees.find(emp => emp.id === formEmployeeId)
    if (!selectedEmp) return

    // Conflict check 1: Overlap with approved leave
    const leave = getDayLeave(formEmployeeId, formDate)
    if (leave) {
      const confirmForce = window.confirm(
        `ATTENZIONE COLLISIONE!\n${selectedEmp.name} ha una richiesta di ${leave.type} (${leave.status === 'Approved' ? 'approvata' : 'in attesa'}) per il giorno ${formDate}.\nVuoi procedere comunque ad assegnare il turno?`
      )
      if (!confirmForce) return
    }

    // Conflict check 2: Already scheduled in similar hours (double shift)
    const existingShifts = getDayShifts(formEmployeeId, formDate).filter(s => !editingShift || s.id !== editingShift.id)
    if (existingShifts.length > 0) {
      const confirmDouble = window.confirm(
        `Nota: ${selectedEmp.name} ha già un altro turno assegnato per questa data (${formDate}).\nVuoi aggiungere un ulteriore turno contemporaneo?`
      )
      if (!confirmDouble) return
    }

    const shiftData = {
      employee_id: formEmployeeId,
      employee_name: selectedEmp.name,
      shift_date: formDate,
      start_time: formStartTime,
      end_time: formEndTime,
      shift_type: formType,
      notes: formNotes
    }

    if (editingShift) {
      shiftData.id = editingShift.id
    }

    await onSaveShift(shiftData)
    setIsModalOpen(false)
  }

  // Handle shift delete
  const handleDelete = async () => {
    if (!editingShift) return
    if (window.confirm("Sei sicuro di voler eliminare questo turno lavorativo?")) {
      await onDeleteShift(editingShift.id)
      setIsModalOpen(false)
    }
  }

  // Format date readable
  const formatWeekRange = () => {
    const monday = weekDates[0]
    const sunday = weekDates[6]
    const opt = { day: 'numeric', month: 'short' }
    const optYr = { day: 'numeric', month: 'short', year: 'numeric' }
    return `${monday.toLocaleDateString('it-IT', opt)} - ${sunday.toLocaleDateString('it-IT', optYr)}`
  }

  // Shift type style mapping
  const getShiftBadgeStyle = (type, hasConflict) => {
    let bg = 'var(--primary-light)'
    let color = 'var(--primary)'
    let border = '1px solid rgba(217, 4, 41, 0.15)'

    if (type === 'Mattina') {
      bg = 'rgba(59, 130, 246, 0.1)'
      color = '#3b82f6'
      border = '1px solid rgba(59, 130, 246, 0.2)'
    } else if (type === 'Pomeriggio') {
      bg = 'var(--warning-light)'
      color = 'var(--warning)'
      border = '1px solid rgba(208, 128, 0, 0.2)'
    } else if (type === 'Notte') {
      bg = 'rgba(139, 92, 246, 0.1)'
      color = '#8b5cf6'
      border = '1px solid rgba(139, 92, 246, 0.2)'
    } else if (type === 'Custom') {
      bg = 'var(--success-light)'
      color = 'var(--success)'
      border = '1px solid rgba(15, 159, 110, 0.2)'
    }

    // Force alert outline if conflict is active
    if (hasConflict) {
      border = '1.5px solid var(--danger)'
      bg = 'var(--danger-light)'
    }

    return {
      background: bg,
      color: color,
      border: border,
      borderRadius: 'var(--radius-sm)',
      padding: '4px 6px',
      fontSize: '0.68rem',
      fontWeight: 700,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      cursor: 'pointer',
      transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      boxShadow: 'var(--shadow-sm)'
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header and title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>📅 Planner Grafico dei Turni</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pianificazione settimanale orari dipendenti con collision detector ferie ed esubero ore</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenAddModal()}>
          <Plus size={15} />
          <span>Nuovo Turno Lavorativo</span>
        </button>
      </div>

      {/* Week Navigation Timeline */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={handlePrevWeek}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', minWidth: '220px', textAlignment: 'center', display: 'inline-block' }}>
            {formatWeekRange()}
          </span>
          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={handleNextWeek}>
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }} onClick={handleGoToToday}>
            Oggi
          </button>
        </div>
      </div>

      {/* Main Grid Calendar representation */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '18px', overflowX: 'auto' }}>
        {employees.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nessun dipendente censito nel database. Aggiungi prima personale nel tab Dipendenti.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '2px solid var(--border-color)', height: '40px' }}>
                <th style={{ padding: '10px', textAlignment: 'left', minWidth: '180px', fontWeight: 800, fontSize: '0.78rem' }}>Dipendente</th>
                <th style={{ padding: '10px', textAlignment: 'center', width: '90px', fontWeight: 800, fontSize: '0.78rem' }}>Tot. Ore Week</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} style={{ padding: '10px', textAlignment: 'center', minWidth: '110px', fontWeight: 800, fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{WEEK_DAYS[idx]}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const weeklyHours = getWeeklyHours(emp.id)
                const isOvertime = weeklyHours > 40

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', minHeight: '65px' }}>
                    {/* Employee Capsule info */}
                    <td style={{ padding: '10px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{emp.role}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{emp.department}</div>
                    </td>

                    {/* Weekly hours counter */}
                    <td style={{ padding: '10px', textAlignment: 'center', verticalAlign: 'middle' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: isOvertime ? 'var(--danger-light)' : 'rgba(0,0,0,0.03)',
                        color: isOvertime ? 'var(--danger)' : 'var(--text-primary)',
                        border: isOvertime ? '1px solid rgba(224, 36, 36, 0.2)' : '1px solid var(--border-color)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }} title={isOvertime ? 'Supero soglia contrattuale di 40h' : 'Totale ore programmate'}>
                        {weeklyHours}h
                        {isOvertime && <AlertTriangle size={10} />}
                      </span>
                    </td>

                    {/* Weekly grid cells */}
                    {weekDatesStr.map((dateStr, idx) => {
                      const dayShifts = getDayShifts(emp.id, dateStr)
                      const leave = getDayLeave(emp.id, dateStr)
                      const hasConflict = dayShifts.length > 0 && !!leave

                      return (
                        <td 
                          key={idx} 
                          style={{ 
                            padding: '6px', 
                            verticalAlign: 'top', 
                            background: leave ? 'rgba(0,0,0,0.015)' : 'transparent',
                            borderRight: '1px solid var(--border-color)',
                            position: 'relative'
                          }}
                          className="shift-grid-cell"
                        >
                          {/* Leave conflict alert */}
                          {leave && (
                            <div style={{
                              background: leave.type === 'Ferie' ? 'var(--success-light)' : leave.type === 'Malattia' ? 'var(--danger-light)' : 'var(--warning-light)',
                              color: leave.type === 'Ferie' ? 'var(--success)' : leave.type === 'Malattia' ? 'var(--danger)' : 'var(--warning)',
                              fontSize: '0.6rem',
                              padding: '2px 4px',
                              borderRadius: '2px',
                              fontWeight: 800,
                              textAlign: 'center',
                              marginBottom: '6px',
                              border: `1px dashed ${leave.type === 'Ferie' ? 'var(--success)' : leave.type === 'Malattia' ? 'var(--danger)' : 'var(--warning)'}`
                            }} title={`Assenza registrata: ${leave.notes || 'Nessuna nota'}`}>
                              🏝️ {leave.type.toUpperCase()} ({leave.status === 'Approved' ? 'APP' : 'PEND'})
                            </div>
                          )}

                          {/* Render shifts inside cell */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dayShifts.map(shift => (
                              <div
                                key={shift.id}
                                style={getShiftBadgeStyle(shift.shift_type, !!leave)}
                                onClick={(e) => handleOpenEditModal(shift, e)}
                                title={shift.notes || 'Turno assegnato'}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
                                  <span>{shift.shift_type}</span>
                                  <Clock size={9} />
                                </div>
                                <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>
                                  {shift.start_time} - {shift.end_time}
                                </span>
                                {shift.notes && (
                                  <span style={{ 
                                    fontSize: '0.58rem', 
                                    opacity: 0.7, 
                                    borderTop: '0.5px solid rgba(0,0,0,0.1)', 
                                    paddingTop: '2px', 
                                    marginTop: '2px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {shift.notes}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add button on hover */}
                          <button
                            className="cell-add-btn"
                            onClick={() => handleOpenAddModal(emp.id, dateStr)}
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              opacity: 0,
                              transition: 'opacity 0.15s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                            title="Assegna turno"
                          >
                            <Plus size={10} />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Grid Legend */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Legenda Turni:</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '2px' }} />
          <span>Mattina (08:00 - 16:00)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--warning-light)', border: '1px solid rgba(208, 128, 0, 0.3)', borderRadius: '2px' }} />
          <span>Pomeriggio (14:00 - 22:00)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '2px' }} />
          <span>Notte (22:00 - 06:00)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--success-light)', border: '1px solid rgba(15, 159, 110, 0.3)', borderRadius: '2px' }} />
          <span>Custom / Altro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--danger-light)', border: '1.5px solid var(--danger)', borderRadius: '2px' }} />
          <span style={{ fontWeight: 700, color: 'var(--danger)' }}>Collisione Rilevata (In Ferie/Assente)</span>
        </div>
      </div>

      {/* INTERACTIVE ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ background: 'var(--bg-card)', maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                {editingShift ? "✍️ Modifica Turno Lavorativo" : "📅 Programma Nuovo Turno"}
              </h3>
              <button 
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-primary)' }} 
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitShift}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Employee selection */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Dipendente *</label>
                  <select
                    required
                    value={formEmployeeId}
                    onChange={e => setFormEmployeeId(e.target.value)}
                    disabled={!!editingShift}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                {/* Date selection */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Data del Turno *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Shift Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Tipologia Turno</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  >
                    <option value="Mattina">Mattina (08:00 - 16:00)</option>
                    <option value="Pomeriggio">Pomeriggio (14:00 - 22:00)</option>
                    <option value="Notte">Notte (22:00 - 06:00)</option>
                    <option value="Custom">Custom / Orario Personalizzato</option>
                  </select>
                </div>

                {/* Time selection (only enabled for Custom or editable times) */}
                <div className="grid grid-cols-2" style={{ gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Ora Inizio *</label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      disabled={formType !== 'Custom'}
                      style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Ora Fine *</label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      disabled={formType !== 'Custom'}
                      style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Note / Dettagli Turno</label>
                  <input
                    type="text"
                    placeholder="es. Sede Centrale, Presidio Clienti..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {editingShift && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDelete}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} />
                      <span>Rimuovi</span>
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Annulla
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salva Turno
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX for cell-add-btn and cell hover actions */}
      <style>{`
        .shift-grid-cell:hover .cell-add-btn {
          opacity: 1 !important;
        }
        .shift-grid-cell {
          transition: background 0.1s ease;
        }
        .shift-grid-cell:hover {
          background: rgba(0, 0, 0, 0.02) !important;
        }
      `}</style>
    </div>
  )
}
