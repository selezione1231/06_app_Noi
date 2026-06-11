import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList, Plus, Trash2, Camera, CheckCircle2, FileText,
  HardHat, Package, Clock, X
} from 'lucide-react'
import {
  ModulePage, ModuleHeader, TabBar, Card, TableWrap, THead, tdStyle,
  Pill, EmptyState, Modal, Field, inputStyle, selectStyle,
  ExportButton, SignaturePad, fmtDate
} from '../shared/ui'
import { WP_SITES, WP_EMPLOYEES, WP_CLIENTS } from '../workpro/shared/wpSeed'
import { supabase, isSupabaseConfigured } from '../../supabaseClient'

// ============================================================================
// RapportiniModule — Rapportino di cantiere giornaliero (mobile-first)
// Ore per dipendente, attività, materiali usati, foto, firma touch del
// caposquadra. Persistenza: tabella dedicata 06app_Noi_rapportini
// (una riga per rapportino; demo mode → localStorage).
// ============================================================================

const LS_DEMO = 'demo-rapportini'
const TABLE = '06app_Noi_rapportini'
// Colonne "leggere" per l'archivio (foto e firma caricate solo nel dettaglio)
const LIST_COLS = 'id,date,site_id,site_code,site_name,created_by,signer_name,lines,materials,notes,status,created_at'

function isSharedMode() {
  if (!isSupabaseConfigured) return false
  try { return !localStorage.getItem('demo-user') } catch { return true }
}

function loadDemo() {
  try { const r = localStorage.getItem(LS_DEMO); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveDemo(list) {
  try { localStorage.setItem(LS_DEMO, JSON.stringify(list)) } catch { /* no-op */ }
}

// Comprime una foto lato client (max 900px lato lungo, JPEG ~65%)
function compressImage(file, maxSide = 900, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Immagine non valida'))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * scale)
        cv.height = Math.round(img.height * scale)
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
        resolve(cv.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const EMPTY_FORM = () => ({
  date: new Date().toISOString().slice(0, 10),
  site_id: '',
  lines: [{ employee_id: '', hours: 8, activity: '' }],
  materials: [],
  photos: [],
  notes: '',
  signature: null,
  signer_name: ''
})

const TABS = [
  { id: 'nuovo',    label: 'Nuovo rapportino', icon: Plus },
  { id: 'archivio', label: 'Archivio',         icon: FileText }
]

export default function RapportiniModule({ user }) {
  const shared = useMemo(() => isSharedMode(), [])
  const [tab, setTab] = useState('nuovo')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState(() => (shared ? [] : loadDemo()))
  const [detail, setDetail] = useState(null)   // rapportino aperto nel dettaglio
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Carica l'archivio dal DB (colonne leggere, senza foto/firma)
  const reload = async () => {
    if (!shared) { setList(loadDemo()); return }
    const { data, error } = await supabase
      .from(TABLE).select(LIST_COLS)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    if (!error && Array.isArray(data)) setList(data)
  }
  useEffect(() => { reload() }, [])

  const siteOf = (r) => r.site_code ? `${r.site_code} — ${r.site_name || ''}` : (r.site_name || '—')

  // ── form helpers ───────────────────────────────────────────────────────────
  const setLine = (i, patch) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }))
  const addLine = () =>
    setForm(f => ({ ...f, lines: [...f.lines, { employee_id: '', hours: 8, activity: '' }] }))
  const removeLine = (i) =>
    setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))

  const setMaterial = (i, patch) =>
    setForm(f => ({ ...f, materials: f.materials.map((m, idx) => idx === i ? { ...m, ...patch } : m) }))
  const addMaterial = () =>
    setForm(f => ({ ...f, materials: [...f.materials, { name: '', qty: 1, unit: 'pz' }] }))
  const removeMaterial = (i) =>
    setForm(f => ({ ...f, materials: f.materials.filter((_, idx) => idx !== i) }))

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length === 0) return
    const room = 4 - form.photos.length
    if (room <= 0) { alert('Massimo 4 foto per rapportino.'); return }
    try {
      const compressed = await Promise.all(files.slice(0, room).map(f => compressImage(f)))
      setForm(f => ({ ...f, photos: [...f.photos, ...compressed] }))
    } catch (err) {
      alert('Errore nel caricamento foto: ' + err.message)
    }
  }
  const removePhoto = (i) =>
    setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))

  // ── salvataggio ────────────────────────────────────────────────────────────
  const totalHours = form.lines.reduce((s, l) => s + (Number(l.hours) || 0), 0)

  const save = async () => {
    const validLines = form.lines.filter(l => l.employee_id && Number(l.hours) > 0)
    if (!form.site_id)            { alert('Seleziona il cantiere.'); return }
    if (validLines.length === 0)  { alert('Inserisci almeno una riga ore (dipendente + ore).'); return }
    if (!form.signature)          { alert('Manca la firma del caposquadra.'); return }
    if (!form.signer_name.trim()) { alert('Indica nome e cognome di chi firma.'); return }

    const site = WP_SITES.find(s => s.id === form.site_id)
    const row = {
      date: form.date,
      site_id: form.site_id,
      site_code: site?.code || '',
      site_name: site?.name || '',
      created_by: user?.email || null,
      signer_name: form.signer_name.trim(),
      lines: validLines.map(l => ({
        ...l,
        hours: Number(l.hours),
        employee_name: WP_EMPLOYEES.find(e => e.id === l.employee_id)?.name || l.employee_id
      })),
      materials: form.materials.filter(m => m.name.trim()),
      photos: form.photos,
      notes: form.notes.trim(),
      signature: form.signature,
      status: 'Firmato'
    }

    setSaving(true)
    try {
      if (shared) {
        const { error } = await supabase.from(TABLE).insert([row])
        if (error) throw error
        await reload()
      } else {
        const updated = [{ ...row, id: 'rap-' + Date.now(), created_at: new Date().toISOString() }, ...list]
        setList(updated)
        saveDemo(updated)
      }
      alert('✅ Rapportino salvato e firmato.')
      setForm(EMPTY_FORM())
      setTab('archivio')
    } catch (e) {
      alert('Errore nel salvataggio del rapportino: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── dettaglio (carica foto+firma solo all'apertura) ────────────────────────
  const openDetail = async (r) => {
    if (!shared) { setDetail(r); return }
    setLoadingDetail(true)
    setDetail(r)
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', r.id).maybeSingle()
    if (!error && data) setDetail(data)
    setLoadingDetail(false)
  }

  const deleteReport = async (r) => {
    if (!window.confirm(`Eliminare il rapportino del ${fmtDate(r.date)} (${siteOf(r)})?`)) return
    if (shared) {
      const { error } = await supabase.from(TABLE).delete().eq('id', r.id)
      if (error) { alert('Errore eliminazione: ' + error.message); return }
      await reload()
    } else {
      const updated = list.filter(x => x.id !== r.id)
      setList(updated)
      saveDemo(updated)
    }
    setDetail(null)
  }

  // ── export: una riga per dipendente/giorno ─────────────────────────────────
  const exportRows = list.flatMap(r => (r.lines || []).map(l => ({
    'Data': r.date,
    'Cantiere': r.site_code || '',
    'Descrizione cantiere': r.site_name || '',
    'Dipendente': l.employee_name || l.employee_id,
    'Ore': l.hours,
    'Attività': l.activity || '',
    'Materiali': (r.materials || []).map(m => `${m.name} x${m.qty}${m.unit || ''}`).join('; '),
    'Firmato da': r.signer_name || '',
    'Note': r.notes || ''
  })))

  const totHoursOf = (r) => (r.lines || []).reduce((s, l) => s + (Number(l.hours) || 0), 0)

  return (
    <ModulePage>
      <ModuleHeader
        icon={ClipboardList}
        title="Rapportini di cantiere"
        subtitle="Rapportino giornaliero: ore per commessa, materiali, foto e firma del caposquadra."
      />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ===== NUOVO RAPPORTINO ===== */}
      {tab === 'nuovo' && (
        <Card style={{ padding: '16px', maxWidth: '760px' }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Field label="Data">
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Cantiere / Commessa">
              <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))} style={selectStyle}>
                <option value="">— Seleziona cantiere —</option>
                {WP_SITES.map(s => {
                  const cli = WP_CLIENTS.find(c => c.id === s.client_id)
                  return <option key={s.id} value={s.id}>{s.code} — {s.name}{cli ? ` (${cli.name})` : ''}</option>
                })}
              </select>
            </Field>
          </div>

          {/* ORE SQUADRA */}
          <h4 style={{ margin: '18px 0 8px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} /> Ore squadra
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              Totale: {totalHours} h
            </span>
          </h4>
          {form.lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 2fr) 70px minmax(120px, 2fr) 34px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
              <select value={l.employee_id} onChange={e => setLine(i, { employee_id: e.target.value })} style={selectStyle}>
                <option value="">— Dipendente —</option>
                {WP_EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input type="number" min="0" max="24" step="0.5" value={l.hours}
                onChange={e => setLine(i, { hours: e.target.value })} style={inputStyle} />
              <input type="text" placeholder="Attività svolta…" value={l.activity}
                onChange={e => setLine(i, { activity: e.target.value })} style={inputStyle} />
              <button type="button" onClick={() => removeLine(i)} disabled={form.lines.length === 1}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: form.lines.length === 1 ? 0.3 : 1 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addLine} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
            <Plus size={13} /> Aggiungi dipendente
          </button>

          {/* MATERIALI */}
          <h4 style={{ margin: '18px 0 8px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={15} /> Materiali utilizzati
          </h4>
          {form.materials.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 3fr) 70px 70px 34px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
              <input type="text" placeholder="Materiale (es. Cavo FO 48f)…" value={m.name}
                onChange={e => setMaterial(i, { name: e.target.value })} style={inputStyle} />
              <input type="number" min="0" step="any" value={m.qty}
                onChange={e => setMaterial(i, { qty: e.target.value })} style={inputStyle} />
              <select value={m.unit} onChange={e => setMaterial(i, { unit: e.target.value })} style={selectStyle}>
                {['pz', 'm', 'kg', 'lt', 'conf'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" onClick={() => removeMaterial(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addMaterial} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
            <Plus size={13} /> Aggiungi materiale
          </button>

          {/* FOTO */}
          <h4 style={{ margin: '18px 0 8px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Camera size={15} /> Foto dal cantiere <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>(max 4, compresse in automatico)</span>
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {form.photos.map((p, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={p} alt={`foto ${i + 1}`} style={{ width: '74px', height: '74px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <button type="button" onClick={() => removePhoto(i)}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
            {form.photos.length < 4 && (
              <label style={{ width: '74px', height: '74px', border: '1.5px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.65rem', gap: '4px' }}>
                <Camera size={18} />
                Scatta/Carica
                <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* NOTE */}
          <h4 style={{ margin: '18px 0 8px', fontSize: '0.82rem', fontWeight: 800 }}>Note</h4>
          <textarea rows={2} placeholder="Note di giornata, problemi riscontrati…" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical' }} />

          {/* FIRMA */}
          <h4 style={{ margin: '18px 0 8px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardHat size={15} /> Firma del caposquadra
          </h4>
          <input type="text" placeholder="Nome e cognome di chi firma…" value={form.signer_name}
            onChange={e => setForm(f => ({ ...f, signer_name: e.target.value }))}
            style={{ ...inputStyle, marginBottom: '8px' }} />
          <SignaturePad onChange={(sig) => setForm(f => ({ ...f, signature: sig }))} />

          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}
            style={{ marginTop: '16px', width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 800, opacity: saving ? 0.6 : 1 }}>
            <CheckCircle2 size={16} /> {saving ? 'Salvataggio…' : 'Salva e firma rapportino'}
          </button>
        </Card>
      )}

      {/* ===== ARCHIVIO ===== */}
      {tab === 'archivio' && (
        list.length === 0 ? (
          <Card><EmptyState icon={ClipboardList} title="Nessun rapportino" text="Crea il primo rapportino dal tab «Nuovo rapportino»." /></Card>
        ) : (
          <TableWrap exportName="rapportini_cantiere" exportRows={exportRows}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <THead cols={['Data', 'Cantiere', 'Ore tot.', 'Squadra', 'Materiali', 'Firmato da', '']} />
              <tbody>
                {list.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                    <td style={tdStyle}>{fmtDate(r.date)}</td>
                    <td style={tdStyle}><strong>{r.site_code}</strong><br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.site_name}</span></td>
                    <td style={tdStyle}><Pill bg="rgba(37,99,235,0.1)" color="#2563eb">{totHoursOf(r)} h</Pill></td>
                    <td style={tdStyle}>{(r.lines || []).length} pers.</td>
                    <td style={tdStyle}>{(r.materials || []).length}</td>
                    <td style={tdStyle}>{r.signer_name || '—'}</td>
                    <td style={tdStyle}>
                      <button onClick={(e) => { e.stopPropagation(); deleteReport(r) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Elimina">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )
      )}

      {/* ===== DETTAGLIO ===== */}
      {detail && (
        <Modal open title={`Rapportino ${fmtDate(detail.date)} — ${detail.site_code || ''}`} onClose={() => setDetail(null)}>
          <div style={{ fontSize: '0.82rem' }}>
            <div style={{ marginBottom: '10px', color: 'var(--text-muted)' }}>
              {detail.site_name} · inserito da {detail.created_by || 'demo'}
            </div>

            <h4 style={{ margin: '10px 0 6px', fontSize: '0.78rem', fontWeight: 800 }}>Ore squadra</h4>
            {(detail.lines || []).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span>{l.employee_name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{l.activity}</span>
                <strong>{l.hours} h</strong>
              </div>
            ))}

            {(detail.materials || []).length > 0 && (
              <>
                <h4 style={{ margin: '14px 0 6px', fontSize: '0.78rem', fontWeight: 800 }}>Materiali</h4>
                {(detail.materials || []).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>{m.name}</span><strong>{m.qty} {m.unit}</strong>
                  </div>
                ))}
              </>
            )}

            {detail.notes && (
              <>
                <h4 style={{ margin: '14px 0 6px', fontSize: '0.78rem', fontWeight: 800 }}>Note</h4>
                <p style={{ margin: 0 }}>{detail.notes}</p>
              </>
            )}

            {loadingDetail ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '14px' }}>Carico foto e firma…</p>
            ) : (
              <>
                {(detail.photos || []).length > 0 && (
                  <>
                    <h4 style={{ margin: '14px 0 6px', fontSize: '0.78rem', fontWeight: 800 }}>Foto</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {detail.photos.map((p, i) => (
                        <a key={i} href={p} target="_blank" rel="noreferrer">
                          <img src={p} alt={`foto ${i + 1}`} style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {detail.signature && (
                  <>
                    <h4 style={{ margin: '14px 0 6px', fontSize: '0.78rem', fontWeight: 800 }}>Firma — {detail.signer_name}</h4>
                    <img src={detail.signature} alt="firma" style={{ maxWidth: '260px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </ModulePage>
  )
}
