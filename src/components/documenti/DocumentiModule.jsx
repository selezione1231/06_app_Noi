import React, { useState, useMemo } from 'react'
import {
  FileText, Upload, Download, Trash2, Search, Filter,
  FileCheck, AlertTriangle, Clock, Plus, Eye, Tag, Users
} from 'lucide-react'

// ============================================================================
// DocumentiModule — gestione documenti e contratti HR
// Categorie: Contratto, Busta Paga, Documento Identità, Certificato, Altro
// Stato: Valido, In Scadenza (< 30gg), Scaduto
// ============================================================================

const LS_KEY = 'todos-documenti'

const CATEGORIES = ['Contratto', 'Busta Paga', 'Documento Identità', 'Certificato Medico', 'Formazione', 'DPI', 'Altro']
const CATEGORY_COLORS = {
  'Contratto':           { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Busta Paga':         { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Documento Identità': { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  'Certificato Medico': { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  'Formazione':         { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'DPI':                { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  'Altro':              { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' }
}

const EMPLOYEES_DEMO = [
  { id: 'demo-emp-1', name: 'Mario Rossi' },
  { id: 'demo-emp-2', name: 'Laura Bianchi' },
  { id: 'demo-emp-3', name: 'Alessandro Neri' },
  { id: 'demo-emp-4', name: 'Sofia Gialli' },
  { id: 'demo-emp-5', name: 'Valerio Verdi' }
]

const INITIAL_DOCS = [
  { id: 'doc-1', employee_id: 'demo-emp-1', employee_name: 'Mario Rossi', category: 'Contratto', title: 'Contratto TI - Mario Rossi', file_name: 'contratto_rossi_2024.pdf', size_kb: 420, uploaded_at: '2024-01-15', expiry_date: null, tags: ['assunzione'], notes: 'Contratto a tempo indeterminato Tech' },
  { id: 'doc-2', employee_id: 'demo-emp-1', employee_name: 'Mario Rossi', category: 'Documento Identità', title: "Carta d'identità - Mario Rossi", file_name: 'ci_rossi.jpg', size_kb: 180, uploaded_at: '2024-01-15', expiry_date: '2029-05-20', tags: [], notes: '' },
  { id: 'doc-3', employee_id: 'demo-emp-1', employee_name: 'Mario Rossi', category: 'Certificato Medico', title: 'Visita Medica Idoneità Q1/2026', file_name: 'visita_medica_rossi_2026.pdf', size_kb: 95, uploaded_at: '2026-02-10', expiry_date: '2026-08-15', tags: ['idoneità'], notes: 'Idoneo con prescrizione visiva' },
  { id: 'doc-4', employee_id: 'demo-emp-2', employee_name: 'Laura Bianchi', category: 'Contratto', title: 'Contratto TI - Laura Bianchi', file_name: 'contratto_bianchi_2024.pdf', size_kb: 390, uploaded_at: '2024-06-01', expiry_date: null, tags: ['assunzione'], notes: '' },
  { id: 'doc-5', employee_id: 'demo-emp-3', employee_name: 'Alessandro Neri', category: 'Formazione', title: 'Attestato Sicurezza - 16h', file_name: 'sicurezza_neri_2023.pdf', size_kb: 210, uploaded_at: '2023-09-22', expiry_date: '2028-09-22', tags: ['sicurezza', '81/08'], notes: 'Corso generale D.Lgs. 81/08' },
  { id: 'doc-6', employee_id: 'demo-emp-4', employee_name: 'Sofia Gialli', category: 'Contratto', title: 'Contratto TD 1 anno - Sofia Gialli', file_name: 'contratto_gialli_2025.pdf', size_kb: 380, uploaded_at: '2025-09-01', expiry_date: '2026-08-31', tags: ['determinato'], notes: 'Scadenza agosto 2026' },
  { id: 'doc-7', employee_id: 'demo-emp-5', employee_name: 'Valerio Verdi', category: 'Contratto', title: 'Contratto Apprendistato - Valerio Verdi', file_name: 'apprendistato_verdi_2026.pdf', size_kb: 450, uploaded_at: '2026-05-02', expiry_date: '2029-05-02', tags: ['apprendistato'], notes: '' },
  { id: 'doc-8', employee_id: 'demo-emp-3', employee_name: 'Alessandro Neri', category: 'Documento Identità', title: "Carta d'identità - A. Neri", file_name: 'ci_neri.jpg', size_kb: 175, uploaded_at: '2023-03-10', expiry_date: '2026-06-15', tags: [], notes: 'IN SCADENZA' }
]

function loadDocs() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : INITIAL_DOCS
  } catch { return INITIAL_DOCS }
}

function saveDocs(docs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(docs)) } catch { /* no-op */ }
}

function getDocStatus(expiry_date) {
  if (!expiry_date) return 'valido'
  const today = new Date()
  const exp = new Date(expiry_date)
  const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'scaduto'
  if (daysLeft <= 30) return 'in-scadenza'
  return 'valido'
}

const STATUS_CFG = {
  'valido':      { label: 'Valido',      color: '#16a34a', bg: '#f0fdf4', icon: FileCheck },
  'in-scadenza': { label: 'In scadenza', color: '#d97706', bg: '#fffbeb', icon: Clock },
  'scaduto':     { label: 'Scaduto',     color: '#ef4444', bg: '#fef2f2', icon: AlertTriangle }
}

export default function DocumentiModule({ userRoles = [] }) {
  const [docs, setDocs] = useState(loadDocs)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Tutte')
  const [filterEmp, setFilterEmp] = useState('Tutti')
  const [filterStatus, setFilterStatus] = useState('Tutti')
  const [showAdd, setShowAdd] = useState(false)
  const [preview, setPreview] = useState(null)

  const [form, setForm] = useState({
    employee_id: '', category: 'Contratto', title: '', file_name: '',
    expiry_date: '', tags: '', notes: ''
  })

  const filtered = useMemo(() => {
    return docs.filter(d => {
      const status = getDocStatus(d.expiry_date)
      const q = search.toLowerCase()
      return (
        (filterCat === 'Tutte' || d.category === filterCat) &&
        (filterEmp === 'Tutti' || d.employee_id === filterEmp) &&
        (filterStatus === 'Tutti' || status === filterStatus) &&
        (!q || d.title.toLowerCase().includes(q) || d.employee_name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
      )
    })
  }, [docs, search, filterCat, filterEmp, filterStatus])

  const stats = useMemo(() => ({
    total: docs.length,
    scaduti: docs.filter(d => getDocStatus(d.expiry_date) === 'scaduto').length,
    inScadenza: docs.filter(d => getDocStatus(d.expiry_date) === 'in-scadenza').length,
    validi: docs.filter(d => getDocStatus(d.expiry_date) === 'valido').length
  }), [docs])

  const handleAdd = () => {
    if (!form.employee_id || !form.title || !form.file_name) return
    const emp = EMPLOYEES_DEMO.find(e => e.id === form.employee_id)
    const newDoc = {
      id: 'doc-' + Date.now(),
      employee_id: form.employee_id,
      employee_name: emp?.name || '',
      category: form.category,
      title: form.title,
      file_name: form.file_name,
      size_kb: Math.floor(Math.random() * 400 + 100),
      uploaded_at: new Date().toISOString().slice(0, 10),
      expiry_date: form.expiry_date || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      notes: form.notes
    }
    const updated = [newDoc, ...docs]
    setDocs(updated)
    saveDocs(updated)
    setShowAdd(false)
    setForm({ employee_id: '', category: 'Contratto', title: '', file_name: '', expiry_date: '', tags: '', notes: '' })
  }

  const handleDelete = (id) => {
    if (!window.confirm('Eliminare questo documento?')) return
    const updated = docs.filter(d => d.id !== id)
    setDocs(updated)
    saveDocs(updated)
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
    border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px',
    fontSize: '0.85rem', outline: 'none'
  }
  const selectStyle = { ...inputStyle, background: 'white' }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        <FileText size={30} style={{ color: 'var(--primary, #A82238)', marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>
            Documenti & Contratti
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.84rem', margin: '4px 0 0' }}>
            Archivio centralizzato dei documenti HR per dipendente. Monitora scadenze e stati.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'var(--primary, #A82238)', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <Plus size={16} /> Aggiungi documento
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Totale', value: stats.total, color: '#1e293b', bg: '#f8fafc' },
          { label: 'Validi', value: stats.validi, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'In scadenza', value: stats.inScadenza, color: '#d97706', bg: '#fffbeb' },
          { label: 'Scaduti', value: stats.scaduti, color: '#ef4444', bg: '#fef2f2' }
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '3px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per titolo, dipendente..."
            style={{ ...inputStyle, paddingLeft: '32px' }}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...selectStyle, flex: '0 0 auto' }}>
          <option>Tutte</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={{ ...selectStyle, flex: '0 0 auto' }}>
          <option value="Tutti">Tutti i dipendenti</option>
          {EMPLOYEES_DEMO.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, flex: '0 0 auto' }}>
          <option value="Tutti">Tutti gli stati</option>
          <option value="valido">Validi</option>
          <option value="in-scadenza">In scadenza</option>
          <option value="scaduto">Scaduti</option>
        </select>
      </div>

      {/* Tabella documenti */}
      <div style={{ background: 'white', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Nessun documento trovato</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                {['Documento', 'Dipendente', 'Categoria', 'Scadenza', 'Stato', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, idx) => {
                const status = getDocStatus(doc.expiry_date)
                const sCfg = STATUS_CFG[status]
                const catCfg = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS['Altro']
                const SIcon = sCfg.icon
                return (
                  <tr key={doc.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary, #1e293b)' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>{doc.file_name} · {doc.size_kb}KB · {doc.uploaded_at}</div>
                      {doc.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {doc.tags.map(t => (
                            <span key={t} style={{ padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.65rem', color: '#475569' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-secondary, #475569)', whiteSpace: 'nowrap' }}>
                      {doc.employee_name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}` }}>
                        {doc.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: doc.expiry_date ? 'var(--text-secondary, #475569)' : 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>
                      {doc.expiry_date || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: sCfg.bg, color: sCfg.color }}>
                        <SIcon size={11} />
                        {sCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setPreview(doc)} title="Anteprima" style={{ padding: '5px 8px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#64748b' }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDelete(doc.id)} title="Elimina" style={{ padding: '5px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal aggiunta */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
              Aggiungi documento
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Dipendente *</label>
                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} style={selectStyle}>
                  <option value="">Seleziona dipendente...</option>
                  {EMPLOYEES_DEMO.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Categoria *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={selectStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Titolo documento *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="es. Contratto TI - Mario Rossi" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Nome file *</label>
                <input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} placeholder="es. contratto_rossi_2026.pdf" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Data scadenza (facoltativa)</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Tag (separati da virgola)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="es. assunzione, CCNL, 81/08" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Note</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={handleAdd} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--primary, #A82238)', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Salva documento</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <FileText size={22} style={{ color: 'var(--primary, #A82238)' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', flex: 1 }}>{preview.title}</h2>
              <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}>×</button>
            </div>
            {[
              ['Dipendente', preview.employee_name],
              ['Categoria', preview.category],
              ['File', preview.file_name],
              ['Dimensione', `${preview.size_kb} KB`],
              ['Caricato il', preview.uploaded_at],
              ['Scadenza', preview.expiry_date || 'Nessuna'],
              ['Stato', STATUS_CFG[getDocStatus(preview.expiry_date)].label],
              ['Note', preview.notes || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>{k}</span>
                <span style={{ color: 'var(--text-primary, #1e293b)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#0369a1' }}>
              <Download size={14} />
              In produzione qui sarà disponibile il download del file caricato su Supabase Storage.
            </div>
            <button onClick={() => setPreview(null)} style={{ marginTop: '16px', width: '100%', padding: '10px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
