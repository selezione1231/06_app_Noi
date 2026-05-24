import React, { useState, useEffect } from 'react'
import { X, Briefcase, FileText } from 'lucide-react'

export default function JobModal({ isOpen, onClose, onSave, editingJob }) {
  const [recordType, setRecordType] = useState('job') // 'job' (ricerca) o 'template' (anagrafica)
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('Open')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title || '')
      setDepartment(editingJob.department || '')
      setStatus(editingJob.status || 'Open')
      setDescription(editingJob.description || '')
      setRequirements(editingJob.requirements || '')
      setRecordType(editingJob.isTemplate ? 'template' : 'job')
    } else {
      setTitle('')
      setDepartment('')
      setStatus('Open')
      setDescription('')
      setRequirements('')
      setRecordType('job')
    }
  }, [editingJob, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      id: editingJob?.id,
      title,
      department,
      status: recordType === 'template' ? 'Template' : status,
      description,
      requirements,
      isTemplate: recordType === 'template'
    })
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '600px', animation: 'fadeIn 0.2s ease' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>
              {editingJob 
                ? (recordType === 'template' ? 'Modifica Template Anagrafica' : 'Modifica Ricerca Lavorativa') 
                : 'Nuovo Inserimento'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* RECORD TYPE SELECTOR */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tipologia di Inserimento *
              </label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                disabled={!!editingJob} // Evita di convertire un job esistente in template o viceversa per sicurezza
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--primary)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                <option value="job">📋 Avvia Ricerca Attiva (Aperta immediatamente ai candidati)</option>
                <option value="template">📂 Salva in Anagrafica Template (Modello da riutilizzare in futuro)</option>
              </select>
            </div>

            {/* Title & Status/Department Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: recordType === 'template' ? '1fr' : '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Titolo Posizione *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Sviluppatore React Standard"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.01)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              
              {recordType === 'job' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Stato Selezioni *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      height: '42px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Open">Ricerca Attiva (Aperta)</option>
                    <option value="Closed">Archiviata (Chiusa)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Dipartimento / Reparto *
              </label>
              <input
                type="text"
                required
                placeholder="es. Tecnologia, Commerciale, Customer Care, Amministrazione"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.01)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Descrizione del Ruolo (Job Description) *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Inserisci la descrizione dettagliata del ruolo. Questo testo servirà all'AI per analizzare e valutare la compatibilità (matching score) dei CV inseriti."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.01)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: '1.4',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Requirements */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Requisiti Tecnici o Soft Skills (Opzionale)
              </label>
              <textarea
                rows={3}
                placeholder="es. 3+ anni React, Laurea informatica, Spiccata doti commerciali, Inglese B2. Un requisito per riga aiuta il matching AI."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.01)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: '1.4',
                  fontSize: '0.85rem'
                }}
              />
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
              Salva
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
