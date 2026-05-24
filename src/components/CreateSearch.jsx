import React, { useState } from 'react'
import { Briefcase, ArrowLeft, Send } from 'lucide-react'

export default function CreateSearch({ onSave, onCancel }) {
  const [recordType, setRecordType] = useState('job') // 'job' (ricerca) o 'template' (anagrafica)
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('Open')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !department.trim() || !description.trim()) return

    setIsSubmitting(true)
    try {
      await onSave({
        title,
        department,
        status: recordType === 'template' ? 'Template' : status,
        description,
        requirements,
        isTemplate: recordType === 'template'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.2s ease' }}>
      
      {/* Back button */}
      <button
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={14} />
        <span>Torna alle ricerche</span>
      </button>

      {/* Main Form Box */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        padding: '24px',
        border: '1.5px solid var(--border-color)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px' }}>
          <Briefcase size={22} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Avvia Nuova Ricerca o Template
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          
          {/* Tipologia di Inserimento */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Tipologia di Inserimento *
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
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
              <option value="template">📂 Salva in Anagrafica Template (Modello per ruoli ricorrenti)</option>
            </select>
          </div>

          {/* Titolo e Reparto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Titolo della Posizione / Ricerca *
              </label>
              <input
                type="text"
                required
                placeholder="es. Senior Frontend Developer React"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.01)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Dipartimento / Reparto *
              </label>
              <input
                type="text"
                required
                placeholder="es. Tech, Sales, Marketing"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.01)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Descrizione del Ruolo (Job Description) *
            </label>
            <textarea
              required
              rows={5}
              placeholder="Inserisci i dettagli delle attività e responsabilità. L'AI userà questa descrizione per valutare i CV caricati ed estrarre il match score."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.01)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
                lineHeight: '1.4'
              }}
            />
          </div>

          {/* Requisiti */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Requisiti Richiesti (Opzionale)
            </label>
            <textarea
              rows={3}
              placeholder="es. 3+ anni React, Laurea informatica, Spiccate capacità comunicative. Un requisito per riga aiuta il matching AI."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.01)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
                lineHeight: '1.4'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ gap: '6px' }}>
              <Send size={14} />
              <span>{isSubmitting ? 'Salvataggio...' : (recordType === 'template' ? 'Crea Template' : 'Avvia Ricerca')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
