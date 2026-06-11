import React, { useState, useMemo } from 'react'
import {
  GraduationCap, UserMinus, CheckCircle2, Circle, AlertTriangle,
  Plus, ChevronDown, ChevronRight, Trash2, Calendar, Users,
  Laptop, Car, CreditCard, KeyRound, FileText, Package
} from 'lucide-react'
import { useSharedState } from '../shared/ui'

// ============================================================================
// OffboardingModule — gestione uscita strutturata dei dipendenti
// Checklist per ogni categoria: HR, IT, Servizi Generali, Amministrazione
// Stato: In lavorazione | Completato | In attesa
// ============================================================================

const LS_KEY = 'todos-offboarding'

const DEPARTMENTS = {
  HR:              { label: 'HR & Contrattuale', color: '#A82238', icon: FileText },
  IT:              { label: 'IT & Accessi',       color: '#3b82f6', icon: Laptop },
  SERVIZI_GEN:     { label: 'Servizi Generali',   color: '#059669', icon: Package },
  AMMINISTRAZIONE: { label: 'Amministrazione',    color: '#7c3aed', icon: CreditCard }
}

const DEFAULT_TASKS = [
  // HR
  { dept: 'HR', task: 'Colloquio di uscita (exit interview)', mandatory: true },
  { dept: 'HR', task: 'Firma lettera di dimissioni / accordo cessazione', mandatory: true },
  { dept: 'HR', task: 'Calcolo e liquidazione TFR', mandatory: true },
  { dept: 'HR', task: 'Comunicazione obbligatoria UNILAV', mandatory: true },
  { dept: 'HR', task: 'Archiviazione fascicolo dipendente', mandatory: true },
  { dept: 'HR', task: 'Invio CUD e documentazione fiscale', mandatory: false },
  // IT
  { dept: 'IT', task: 'Revoca accesso email aziendale', mandatory: true },
  { dept: 'IT', task: 'Revoca accesso sistemi gestionali', mandatory: true },
  { dept: 'IT', task: 'Revoca VPN e accessi remoti', mandatory: true },
  { dept: 'IT', task: 'Recupero laptop aziendale', mandatory: true },
  { dept: 'IT', task: 'Recupero smartphone aziendale', mandatory: false },
  { dept: 'IT', task: 'Backup dati e transfert knowledge', mandatory: false },
  { dept: 'IT', task: 'Chiusura account Slack/Teams/GitLab', mandatory: true },
  // SERVIZI_GEN
  { dept: 'SERVIZI_GEN', task: 'Restituzione auto aziendale', mandatory: false },
  { dept: 'SERVIZI_GEN', task: 'Restituzione carta carburante', mandatory: false },
  { dept: 'SERVIZI_GEN', task: 'Restituzione badge e chiavi sede', mandatory: true },
  { dept: 'SERVIZI_GEN', task: 'Restituzione DPI personali assegnati', mandatory: false },
  { dept: 'SERVIZI_GEN', task: 'Restituzione attrezzatura (utensili, ecc.)', mandatory: false },
  // AMMINISTRAZIONE
  { dept: 'AMMINISTRAZIONE', task: 'Verifica ultime note spese e rimborsi pendenti', mandatory: true },
  { dept: 'AMMINISTRAZIONE', task: 'Chiusura carta di credito aziendale', mandatory: false },
  { dept: 'AMMINISTRAZIONE', task: 'Aggiornamento organigramma', mandatory: false },
  { dept: 'AMMINISTRAZIONE', task: 'Comunicazione ai clienti/fornitori di riferimento', mandatory: false }
]

const EMPLOYEES = [
  { id: 'demo-emp-1', name: 'Mario Rossi',     dept: 'Tech' },
  { id: 'demo-emp-2', name: 'Laura Bianchi',   dept: 'Commerciale' },
  { id: 'demo-emp-3', name: 'Alessandro Neri', dept: 'HR' },
  { id: 'demo-emp-4', name: 'Sofia Gialli',    dept: 'Amministrazione' },
  { id: 'demo-emp-5', name: 'Valerio Verdi',   dept: 'Tech' }
]

const INITIAL_OFFBOARDINGS = [
  {
    id: 'ob-1',
    employee_id: 'demo-emp-3',
    employee_name: 'Alessandro Neri',
    termination_date: '2026-07-31',
    reason: 'Dimissioni volontarie',
    tasks: DEFAULT_TASKS.map((t, i) => ({
      id: `ob1-t-${i}`,
      ...t,
      completed: i < 4,
      completed_by: i < 4 ? 'Admin HR' : null,
      completed_at: i < 4 ? '2026-06-05' : null
    }))
  }
]

export default function OffboardingModule() {
  const [offboardings, setOffboardings] = useSharedState(LS_KEY, INITIAL_OFFBOARDINGS)
  const [selectedId, setSelectedId] = useState(offboardings[0]?.id || null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ employee_id: '', termination_date: '', reason: '' })
  const [openDepts, setOpenDepts] = useState({ HR: true, IT: true, SERVIZI_GEN: true, AMMINISTRAZIONE: true })

  const selected = offboardings.find(o => o.id === selectedId)

  const stats = useMemo(() => {
    if (!selected) return null
    const total = selected.tasks.length
    const done = selected.tasks.filter(t => t.completed).length
    const mandatory_total = selected.tasks.filter(t => t.mandatory).length
    const mandatory_done = selected.tasks.filter(t => t.mandatory && t.completed).length
    return { total, done, pct: Math.round((done / total) * 100), mandatory_total, mandatory_done }
  }, [selected])

  const toggleTask = (taskId) => {
    const updated = offboardings.map(ob => {
      if (ob.id !== selectedId) return ob
      return {
        ...ob,
        tasks: ob.tasks.map(t => t.id === taskId
          ? { ...t, completed: !t.completed, completed_by: !t.completed ? 'Admin' : null, completed_at: !t.completed ? new Date().toISOString().slice(0, 10) : null }
          : t
        )
      }
    })
    setOffboardings(updated)
  }

  const handleCreateOffboarding = () => {
    if (!newForm.employee_id || !newForm.termination_date) return
    const emp = EMPLOYEES.find(e => e.id === newForm.employee_id)
    const newOb = {
      id: 'ob-' + Date.now(),
      employee_id: newForm.employee_id,
      employee_name: emp?.name || '',
      termination_date: newForm.termination_date,
      reason: newForm.reason,
      tasks: DEFAULT_TASKS.map((t, i) => ({
        id: `ob${Date.now()}-t-${i}`,
        ...t,
        completed: false,
        completed_by: null,
        completed_at: null
      }))
    }
    const updated = [newOb, ...offboardings]
    setOffboardings(updated)
    setSelectedId(newOb.id)
    setShowNew(false)
    setNewForm({ employee_id: '', termination_date: '', reason: '' })
  }

  const tasksByDept = (deptId) => selected?.tasks.filter(t => t.dept === deptId) || []

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }
  const selectStyle = { ...inputStyle, background: 'white' }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        <UserMinus size={30} style={{ color: 'var(--primary, #A82238)', marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>Offboarding Dipendenti</h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.84rem', margin: '4px 0 0' }}>Gestione strutturata dell'uscita: checklist per HR, IT, Servizi Generali e Amministrazione.</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--primary, #A82238)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          <Plus size={15} /> Avvia offboarding
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>

        {/* Lista offboarding */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            In corso ({offboardings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {offboardings.map(ob => {
              const total = ob.tasks.length
              const done = ob.tasks.filter(t => t.completed).length
              const pct = Math.round((done / total) * 100)
              const active = ob.id === selectedId
              return (
                <button key={ob.id} onClick={() => setSelectedId(ob.id)} style={{
                  padding: '10px 12px', border: '1px solid', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                  background: active ? 'var(--primary, #A82238)' : 'white',
                  borderColor: active ? 'var(--primary, #A82238)' : 'var(--border-color, #e2e8f0)',
                  color: active ? 'white' : 'var(--text-primary, #1e293b)'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '3px' }}>{ob.employee_name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Uscita: {ob.termination_date}</div>
                  <div style={{ marginTop: '6px', height: 4, background: active ? 'rgba(255,255,255,0.3)' : '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: active ? 'white' : '#16a34a', borderRadius: '99px' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '3px' }}>{done}/{total} task · {pct}%</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dettaglio */}
        {selected && stats && (
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Info dipendente */}
            <div style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary, #1e293b)' }}>{selected.employee_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Uscita prevista: {selected.termination_date} · {selected.reason}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.pct === 100 ? '#16a34a' : stats.pct >= 50 ? '#d97706' : '#ef4444', lineHeight: 1 }}>{stats.pct}%</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{stats.done}/{stats.total} completate</div>
                <div style={{ fontSize: '0.68rem', color: stats.mandatory_done === stats.mandatory_total ? '#16a34a' : '#ef4444', marginTop: '2px' }}>
                  {stats.mandatory_done}/{stats.mandatory_total} obbligatorie
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ height: '100%', width: `${stats.pct}%`, background: stats.pct === 100 ? '#16a34a' : '#A82238', borderRadius: '99px', transition: 'width 0.4s ease' }} />
            </div>

            {/* Sezioni per dipartimento */}
            {Object.entries(DEPARTMENTS).map(([deptId, dept]) => {
              const tasks = tasksByDept(deptId)
              const doneTasks = tasks.filter(t => t.completed).length
              const Icon = dept.icon
              const isOpen = openDepts[deptId] !== false
              return (
                <div key={deptId} style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                  <button
                    onClick={() => setOpenDepts(p => ({ ...p, [deptId]: !p[deptId] }))}
                    style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '7px', background: dept.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} style={{ color: dept.color }} />
                    </div>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary, #1e293b)' }}>{dept.label}</span>
                    <span style={{ fontSize: '0.75rem', color: doneTasks === tasks.length ? '#16a34a' : '#64748b', fontWeight: 600 }}>{doneTasks}/{tasks.length}</span>
                    {isOpen ? <ChevronDown size={14} style={{ color: '#94a3b8' }} /> : <ChevronRight size={14} style={{ color: '#94a3b8' }} />}
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 0' }}>
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 16px', cursor: 'pointer', background: task.completed ? '#f0fdf4' : 'transparent', transition: 'background 0.1s' }}
                          onMouseEnter={e => { if (!task.completed) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (!task.completed) e.currentTarget.style.background = 'transparent' }}
                        >
                          {task.completed
                            ? <CheckCircle2 size={17} style={{ color: '#16a34a', flexShrink: 0 }} />
                            : <Circle size={17} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                          }
                          <span style={{ flex: 1, fontSize: '0.83rem', color: task.completed ? '#64748b' : 'var(--text-primary, #1e293b)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.task}
                            {task.mandatory && !task.completed && (
                              <span style={{ marginLeft: '6px', fontSize: '0.65rem', padding: '1px 5px', background: '#fef2f2', color: '#ef4444', borderRadius: '4px', fontWeight: 700 }}>OBB</span>
                            )}
                          </span>
                          {task.completed && task.completed_at && (
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{task.completed_at}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!selected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)', flexDirection: 'column', gap: '12px' }}>
            <UserMinus size={40} style={{ opacity: 0.3 }} />
            <div>Seleziona o crea un offboarding</div>
          </div>
        )}
      </div>

      {/* Modal nuovo offboarding */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 18px', fontSize: '1.1rem', fontWeight: 800 }}>Avvia offboarding</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dipendente *</label>
                <select value={newForm.employee_id} onChange={e => setNewForm(f => ({ ...f, employee_id: e.target.value }))} style={selectStyle}>
                  <option value="">Seleziona dipendente...</option>
                  {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Data di uscita *</label>
                <input type="date" value={newForm.termination_date} onChange={e => setNewForm(f => ({ ...f, termination_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Motivo cessazione</label>
                <select value={newForm.reason} onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))} style={selectStyle}>
                  <option value="">Seleziona...</option>
                  {['Dimissioni volontarie', 'Licenziamento', 'Scadenza contratto', 'Accordo consensuale', 'Pensionamento', 'Fine apprendistato'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '9px 18px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={handleCreateOffboarding} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--primary, #A82238)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Avvia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
