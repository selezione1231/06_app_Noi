import React, { useState, useMemo } from 'react'
import {
  BookOpen, GraduationCap, Award, Clock, CheckCircle2,
  AlertTriangle, Plus, Users, Calendar, Filter, ChevronRight,
  FileText, Star, BarChart3
} from 'lucide-react'
import { useSharedState } from '../shared/ui'
import { extractCertificateInfo } from '../../utils/gemini'

// ============================================================================
// FormazioneModule — LMS leggero per gestione corsi e certificazioni
// Viste: Catalogo Corsi | Piani Formativi | Certificazioni | Storico
// ============================================================================

const LS_PIANI = 'todos-formazione-piani'
const LS_CERTS = 'todos-formazione-certs'

const EMPLOYEES = [
  { id: 'demo-emp-1', name: 'Mario Rossi',     dept: 'Tech' },
  { id: 'demo-emp-2', name: 'Laura Bianchi',   dept: 'Commerciale' },
  { id: 'demo-emp-3', name: 'Alessandro Neri', dept: 'HR' },
  { id: 'demo-emp-4', name: 'Sofia Gialli',    dept: 'Amministrazione' },
  { id: 'demo-emp-5', name: 'Valerio Verdi',   dept: 'Tech' }
]

const CATALOG = [
  { id: 'c-1',  title: 'Sicurezza sul Lavoro — Corso Base (16h)', category: 'Sicurezza', mandatory: true,  duration_h: 16, validity_years: 5,  provider: 'Interna',       cost: 0,   desc: 'Formazione generale obbligatoria D.Lgs. 81/08.' },
  { id: 'c-2',  title: 'Sicurezza Specifica — Rischio Medio (8h)', category: 'Sicurezza', mandatory: true, duration_h: 8,  validity_years: 5,  provider: 'Ente accreditato', cost: 180, desc: 'Formazione specifica per rischio medio (uffici e cantieri leggeri).' },
  { id: 'c-3',  title: 'Primo Soccorso Aziendale (12h)',          category: 'Sicurezza', mandatory: false, duration_h: 12, validity_years: 3,  provider: 'Croce Rossa',   cost: 220, desc: 'Abilitazione addetto primo soccorso. Obbligatorio per almeno 1 ogni 10 addetti.' },
  { id: 'c-4',  title: 'Antincendio — Rischio Basso (4h)',        category: 'Sicurezza', mandatory: false, duration_h: 4,  validity_years: 5,  provider: 'VVF/Accreditato', cost: 120, desc: 'Formazione antincendio per rischio basso.' },
  { id: 'c-5',  title: 'Lavori in Quota e Anticaduta (8h)',       category: 'Sicurezza', mandatory: false, duration_h: 8,  validity_years: 5,  provider: 'Ente accreditato', cost: 250, desc: 'Per operatori che lavorano ad altezze > 2m.' },
  { id: 'c-6',  title: 'Excel Avanzato',                          category: 'Software',  mandatory: false, duration_h: 6,  validity_years: null, provider: 'Udemy',        cost: 49,  desc: 'Pivot table, Power Query, dashboard avanzate.' },
  { id: 'c-7',  title: 'Project Management (PMP Prep)',            category: 'Gestione', mandatory: false, duration_h: 40, validity_years: null, provider: 'PMI',          cost: 1200, desc: 'Preparazione certificazione PMP.' },
  { id: 'c-8',  title: 'GDPR e Privacy — Aggiornamento',         category: 'Compliance',mandatory: true,  duration_h: 4,  validity_years: 2,  provider: 'Interna',       cost: 0,   desc: 'Obbligatorio per tutti. Aggiornamento GDPR 2024.' },
  { id: 'c-9',  title: 'Comunicazione Efficace',                  category: 'Soft skills',mandatory: false,duration_h: 8,  validity_years: null, provider: 'Coach esterno', cost: 350, desc: 'Tecniche di comunicazione assertiva e feedback.' },
  { id: 'c-10', title: 'Gestione delle Risorse Umane (HR)',       category: 'HR',        mandatory: false, duration_h: 20, validity_years: null, provider: 'Il Sole 24 Ore', cost: 600, desc: 'Approfondimento tematiche HR: selezione, performance, welfare.' }
]

const INITIAL_PIANI = [
  { id: 'p-1', employee_id: 'demo-emp-1', course_id: 'c-1', planned_date: '2027-01-20', status: 'Pianificato', completed_date: null, notes: '' },
  { id: 'p-2', employee_id: 'demo-emp-2', course_id: 'c-8', planned_date: '2026-07-01', status: 'Pianificato', completed_date: null, notes: '' },
  { id: 'p-3', employee_id: 'demo-emp-3', course_id: 'c-10', planned_date: '2026-09-15', status: 'Pianificato', completed_date: null, notes: 'Richiesto da HR Manager' },
  { id: 'p-4', employee_id: 'demo-emp-5', course_id: 'c-1', planned_date: '2026-08-01', status: 'Pianificato', completed_date: null, notes: 'Neo assunto' },
  { id: 'p-5', employee_id: 'demo-emp-5', course_id: 'c-2', planned_date: '2026-08-05', status: 'Pianificato', completed_date: null, notes: '' }
]

const INITIAL_CERTS = [
  { id: 'cert-1', employee_id: 'demo-emp-1', course_id: 'c-1', issued_date: '2022-01-20', expiry_date: '2027-01-20', score: null, notes: '' },
  { id: 'cert-2', employee_id: 'demo-emp-2', course_id: 'c-1', issued_date: '2021-06-10', expiry_date: '2026-06-10', score: null, notes: '' },
  { id: 'cert-3', employee_id: 'demo-emp-3', course_id: 'c-1', issued_date: '2023-03-15', expiry_date: '2028-03-15', score: null, notes: '' },
  { id: 'cert-4', employee_id: 'demo-emp-3', course_id: 'c-8', issued_date: '2024-02-01', expiry_date: '2026-02-01', score: 'Superato', notes: '' },
  { id: 'cert-5', employee_id: 'demo-emp-1', course_id: 'c-3', issued_date: '2023-09-10', expiry_date: '2026-09-10', score: '92/100', notes: 'Eccellente' }
]

function getExpiryStatus(dateStr) {
  if (!dateStr) return 'valido'
  const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'scaduto'
  if (days <= 60) return 'in-scadenza'
  return 'valido'
}

const STATUS_COLORS = {
  'valido':      { color: '#16a34a', bg: '#f0fdf4', label: 'Valido' },
  'in-scadenza': { color: '#d97706', bg: '#fffbeb', label: 'In scadenza' },
  'scaduto':     { color: '#ef4444', bg: '#fef2f2', label: 'Scaduto' }
}

const CATEGORY_COLORS = {
  'Sicurezza':   '#ef4444',
  'Software':    '#3b82f6',
  'Gestione':    '#7c3aed',
  'Compliance':  '#d97706',
  'Soft skills': '#059669',
  'HR':          '#A82238'
}

const TABS = [
  { id: 'catalog',  label: 'Catalogo Corsi', icon: BookOpen },
  { id: 'piani',    label: 'Piani Formativi', icon: Calendar },
  { id: 'certs',    label: 'Certificazioni',  icon: Award },
  { id: 'overview', label: 'Overview',        icon: BarChart3 }
]

export default function FormazioneModule() {
  const [activeTab, setActiveTab] = useState('catalog')
  const [piani, setPiani] = useSharedState(LS_PIANI, INITIAL_PIANI)
  const [certs, setCerts] = useSharedState(LS_CERTS, INITIAL_CERTS)
  const [filterCat, setFilterCat] = useState('Tutte')
  const [showPianoForm, setShowPianoForm] = useState(false)
  const [pianoForm, setPianoForm] = useState({ employee_id: '', course_id: '', planned_date: '', notes: '' })
  // OCR attestati (Gemini vision)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrForm, setOcrForm] = useState(null) // { employee_id, course_title, issued_date, expiry_date, ente }

  // Foto/scansione attestato → Gemini → form di conferma precompilato
  const handleOcrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcrBusy(true)
    try {
      // ridimensiona per contenere il payload (max 1280px, JPEG 80%)
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onerror = () => rej(new Error('Lettura file fallita'))
        reader.onload = () => {
          const img = new Image()
          img.onerror = () => rej(new Error('Immagine non valida'))
          img.onload = () => {
            const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
            const cv = document.createElement('canvas')
            cv.width = Math.round(img.width * scale)
            cv.height = Math.round(img.height * scale)
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
            res(cv.toDataURL('image/jpeg', 0.8))
          }
          img.src = reader.result
        }
        reader.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1]
      const info = await extractCertificateInfo(base64, 'image/jpeg')
      // match best-effort dell'intestatario sui dipendenti
      const matchEmp = EMPLOYEES.find(emp => {
        const who = (info.intestatario || '').toLowerCase()
        return who && emp.name.toLowerCase().split(' ').every(part => who.includes(part))
      })
      setOcrForm({
        employee_id: matchEmp?.id || '',
        course_title: info.corso || '',
        issued_date: info.data_rilascio || '',
        expiry_date: info.data_scadenza || '',
        ente: info.ente || '',
        intestatario: info.intestatario || ''
      })
    } catch (err) {
      alert("Lettura attestato fallita: " + err.message)
    } finally {
      setOcrBusy(false)
    }
  }

  const confirmOcrCert = () => {
    if (!ocrForm.employee_id) { alert('Seleziona il dipendente.'); return }
    if (!ocrForm.course_title) { alert('Indica il titolo del corso.'); return }
    const newCert = {
      id: 'cert-ocr-' + Date.now(),
      employee_id: ocrForm.employee_id,
      course_id: null,
      course_title: ocrForm.course_title,
      issued_date: ocrForm.issued_date || null,
      expiry_date: ocrForm.expiry_date || null,
      score: null,
      notes: ocrForm.ente ? `Ente: ${ocrForm.ente} (da OCR)` : 'Inserito da OCR'
    }
    setCerts([newCert, ...certs])
    setOcrForm(null)
    setActiveTab('certs')
  }

  const getCourseName = (id) => CATALOG.find(c => c.id === id)?.title || id
  const getEmpName = (id) => EMPLOYEES.find(e => e.id === id)?.name || id

  const categories = ['Tutte', ...Array.from(new Set(CATALOG.map(c => c.category)))]

  const filteredCatalog = filterCat === 'Tutte' ? CATALOG : CATALOG.filter(c => c.category === filterCat)

  const handleAddPiano = () => {
    if (!pianoForm.employee_id || !pianoForm.course_id || !pianoForm.planned_date) return
    const newPiano = { ...pianoForm, id: 'p-' + Date.now(), status: 'Pianificato', completed_date: null }
    const updated = [newPiano, ...piani]
    setPiani(updated)
    setShowPianoForm(false)
    setPianoForm({ employee_id: '', course_id: '', planned_date: '', notes: '' })
  }

  const markCompleted = (pianoId) => {
    const updated = piani.map(p => p.id === pianoId
      ? { ...p, status: 'Completato', completed_date: new Date().toISOString().slice(0, 10) }
      : p
    )
    setPiani(updated)
  }

  const overview = useMemo(() => {
    const completionByEmp = EMPLOYEES.map(emp => {
      const empCerts = certs.filter(c => c.employee_id === emp.id)
      const mandatoryIds = CATALOG.filter(c => c.mandatory).map(c => c.id)
      const completed = mandatoryIds.filter(id => empCerts.some(c => c.course_id === id))
      return { ...emp, mandatory_total: mandatoryIds.length, mandatory_done: completed.length }
    })
    return completionByEmp
  }, [certs])

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }
  const selectStyle = { ...inputStyle, background: 'white' }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        <BookOpen size={30} style={{ color: 'var(--primary, #A82238)', marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>Formazione & Certificazioni</h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.84rem', margin: '4px 0 0' }}>LMS aziendale: catalogo corsi, piani formativi individuali, certificazioni e scadenze.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 500,
              background: active ? 'white' : 'transparent',
              color: active ? 'var(--primary, #A82238)' : 'var(--text-muted, #64748b)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
            }}>
              <Icon size={14} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ===== CATALOGO ===== */}
      {activeTab === 'catalog' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '5px 12px', border: '1px solid', borderRadius: '20px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                background: filterCat === cat ? 'var(--primary, #A82238)' : 'white',
                color: filterCat === cat ? 'white' : 'var(--text-secondary, #475569)',
                borderColor: filterCat === cat ? 'var(--primary, #A82238)' : 'var(--border-color, #e2e8f0)'
              }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {filteredCatalog.map(course => {
              const catColor = CATEGORY_COLORS[course.category] || '#64748b'
              return (
                <div key={course.id} style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: catColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={16} style={{ color: catColor }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary, #1e293b)', marginBottom: '4px' }}>{course.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: catColor + '18', color: catColor }}>{course.category}</span>
                        {course.mandatory && <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: '#fef2f2', color: '#ef4444' }}>OBBLIGATORIO</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #475569)' }}>{course.desc}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                    <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{course.duration_h}h</span>
                    <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{course.provider}</span>
                    {course.validity_years && <span><Award size={11} style={{ display: 'inline', marginRight: 3 }} />Valido {course.validity_years} anni</span>}
                    {course.cost > 0 && <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#64748b' }}>€{course.cost}</span>}
                    {course.cost === 0 && <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#16a34a' }}>Gratuito</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== PIANI FORMATIVI ===== */}
      {activeTab === 'piani' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowPianoForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--primary, #A82238)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              <Plus size={15} /> Pianifica corso
            </button>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {['Dipendente', 'Corso', 'Data pianificata', 'Stato', 'Note', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {piani.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: idx < piani.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: '0.83rem' }}>{getEmpName(p.employee_id)}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getCourseName(p.course_id)}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: '#64748b' }}>{p.planned_date}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: p.status === 'Completato' ? '#f0fdf4' : '#fffbeb', color: p.status === 'Completato' ? '#16a34a' : '#d97706' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.78rem', color: '#94a3b8' }}>{p.notes || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {p.status !== 'Completato' && (
                        <button onClick={() => markCompleted(p.id)} title="Segna come completato" style={{ padding: '5px 10px', border: '1px solid #bbf7d0', borderRadius: '6px', background: '#f0fdf4', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Completato
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPianoForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <h2 style={{ margin: '0 0 18px', fontSize: '1.1rem', fontWeight: 800 }}>Pianifica corso formativo</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dipendente *</label>
                    <select value={pianoForm.employee_id} onChange={e => setPianoForm(f => ({ ...f, employee_id: e.target.value }))} style={selectStyle}>
                      <option value="">Seleziona...</option>
                      {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Corso *</label>
                    <select value={pianoForm.course_id} onChange={e => setPianoForm(f => ({ ...f, course_id: e.target.value }))} style={selectStyle}>
                      <option value="">Seleziona corso...</option>
                      {CATALOG.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Data pianificata *</label>
                    <input type="date" value={pianoForm.planned_date} onChange={e => setPianoForm(f => ({ ...f, planned_date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Note</label>
                    <input value={pianoForm.notes} onChange={e => setPianoForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowPianoForm(false)} style={{ padding: '9px 18px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
                  <button onClick={handleAddPiano} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--primary, #A82238)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Pianifica</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== CERTIFICAZIONI ===== */}
      {activeTab === 'certs' && (
        <div style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
            <label className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: ocrBusy ? 0.6 : 1 }}>
              📷 {ocrBusy ? 'Lettura attestato in corso…' : 'Carica attestato (OCR AI)'}
              <input type="file" accept="image/*" capture="environment" onChange={handleOcrFile} disabled={ocrBusy} style={{ display: 'none' }} />
            </label>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Dipendente', 'Corso / Certificazione', 'Emesso il', 'Scadenza', 'Voto/Esito', 'Stato'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {certs.map((cert, idx) => {
                const status = getExpiryStatus(cert.expiry_date)
                const sCfg = STATUS_COLORS[status]
                return (
                  <tr key={cert.id} style={{ borderBottom: idx < certs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: '0.83rem' }}>{getEmpName(cert.employee_id)}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.course_title || getCourseName(cert.course_id)}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: '#64748b' }}>{cert.issued_date}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: '#64748b' }}>{cert.expiry_date || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: '#64748b' }}>{cert.score || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Modale conferma dati OCR */}
          {ocrForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800 }}>📷 Dati letti dall'attestato</h2>
                <p style={{ margin: '0 0 16px', fontSize: '0.76rem', color: '#64748b' }}>
                  Controlla e correggi i dati estratti dall'AI prima di salvare.
                  {ocrForm.intestatario && <> Intestatario letto: <strong>{ocrForm.intestatario}</strong></>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dipendente *</label>
                    <select value={ocrForm.employee_id} onChange={e => setOcrForm(f => ({ ...f, employee_id: e.target.value }))} style={selectStyle}>
                      <option value="">Seleziona...</option>
                      {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Corso / Certificazione *</label>
                    <input value={ocrForm.course_title} onChange={e => setOcrForm(f => ({ ...f, course_title: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Rilasciato il</label>
                      <input type="date" value={ocrForm.issued_date} onChange={e => setOcrForm(f => ({ ...f, issued_date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Scade il</label>
                      <input type="date" value={ocrForm.expiry_date} onChange={e => setOcrForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Ente formatore</label>
                    <input value={ocrForm.ente} onChange={e => setOcrForm(f => ({ ...f, ente: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setOcrForm(null)} style={{ padding: '9px 18px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
                  <button onClick={confirmOcrCert} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--primary, #A82238)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Salva certificazione</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Conformità Corsi Obbligatori per Dipendente</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.map(emp => {
              const pct = emp.mandatory_total > 0 ? Math.round((emp.mandatory_done / emp.mandatory_total) * 100) : 0
              const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444'
              return (
                <div key={emp.id} style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary, #1e293b)' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{emp.dept}</div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color }}>
                      {emp.mandatory_done}/{emp.mandatory_total} obbligatori
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color, minWidth: 40, textAlign: 'right' }}>{pct}%</div>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
