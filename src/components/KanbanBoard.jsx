import React, { useState, useRef } from 'react'
import { ArrowLeft, Upload, FileText, Trash2, Video, Award, ChevronDown, ChevronUp, User, Sparkles, LayoutGrid, Table, Calendar } from 'lucide-react'
import { extractTextFromPdf } from '../utils/pdfParser'
import { extractCandidateInfo, matchCandidateWithJob } from '../utils/gemini'
import { uploadFileToSharePoint } from '../utils/sharepoint'

const COLUMNS = [
  { id: 'Nuovi CV', name: 'Nuovi CV', color: 'var(--text-secondary)' },
  { id: 'Prima Chiamata', name: 'Prima Chiamata', color: 'var(--warning)' },
  { id: 'Primo Colloquio', name: 'Colloquio I', color: 'var(--primary)' },
  { id: 'Secondo Colloquio', name: 'Colloquio II', color: 'var(--accent)' },
  { id: 'Proposta', name: 'Proposta', color: 'var(--primary)' },
  { id: 'Assunto', name: 'Assunti', color: 'var(--success)' },
  { id: 'Respinto', name: 'Respinti', color: 'var(--danger)' }
]

export default function KanbanBoard({ job, candidates, onBack, onUpdateCandidateStage, onDeleteCandidate, onAddCandidate, onSelectCandidate, onEditJob, isDemo }) {
  const [isDescExpanded, setIsDescExpanded] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  
  // Toggle per cambiare vista: 'kanban' o 'table' (compatta a righe)
  const [viewMode, setViewMode] = useState('kanban')
  
  const [processingFiles, setProcessingFiles] = useState([])
  const fileInputRef = useRef(null)

  const jobCandidates = candidates.filter(c => c.job_id === job.id)

  // Drag & Drop Handlers
  const handleDragStart = (e, candidateId) => {
    setDraggedId(candidateId)
    e.dataTransfer.setData('text/plain', candidateId)
    setTimeout(() => {
      const card = document.getElementById(`candidate-card-${candidateId}`)
      if (card) card.classList.add('dragging')
    }, 0)
  }

  const handleDragEnd = (e, candidateId) => {
    setDraggedId(null)
    setDragOverCol(null)
    const card = document.getElementById(`candidate-card-${candidateId}`)
    if (card) card.classList.remove('dragging')
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    if (dragOverCol !== colId) {
      setDragOverCol(colId)
    }
  }

  const handleDrop = (e, colId) => {
    e.preventDefault()
    const candidateId = e.dataTransfer.getData('text/plain')
    if (candidateId) {
      onUpdateCandidateStage(candidateId, colId)
    }
    setDraggedId(null)
    setDragOverCol(null)
  }

  // Gestione upload e parsing CV
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    processCvFiles(files)
  }

  const handleFileDrop = async (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (files.length === 0) return
    processCvFiles(files)
  }

  const processCvFiles = async (files) => {
    // Gestione del caricamento parallelo massivo
    const uploadPromises = files.map(async (file) => {
      const tempId = Math.random().toString(36).substr(2, 9)
      
      // Aggiungi ai file in elaborazione
      setProcessingFiles(prev => [...prev, { id: tempId, name: file.name, status: 'Lettura PDF...' }])
      
      try {
        // Step 1: Estrazione testo da PDF
        const extractedText = await extractTextFromPdf(file)
        
        // Aggiorna stato
        setProcessingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'Estrazione AI...' } : f))
        
        // Step 2: Estrazione informazioni strutturate tramite Gemini
        const parsedInfo = await extractCandidateInfo(extractedText)
        
        // Aggiorna stato
        setProcessingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'Calcolo Matching...' } : f))
        
        // Step 3: Calcolo compatibilità/matching con la Job Description
        const fullJobDesc = `${job.title}\nReparto: ${job.department}\nDescrizione: ${job.description}\nRequisiti: ${job.requirements || ''}`
        const matchingReport = await matchCandidateWithJob(parsedInfo, fullJobDesc)
        
        // Step 4: Salva il candidato nel database con i metadati ed il testo estratto
        const newCandidate = {
          job_id: job.id,
          name: parsedInfo.nome || file.name.replace('.pdf', ''),
          email: parsedInfo.email,
          phone: parsedInfo.phone,
          stage: 'Nuovi CV',
          cv_text: extractedText,
          competenze: parsedInfo.competenze || [],
          esperienze: parsedInfo.esperienze || [],
          istruzione: parsedInfo.istruzione || [],
          fit_score: matchingReport.fit_score || 70,
          match_analysis: matchingReport,
          stato_interazione: 'Da contattare',
          cv_url: ""
        }
        
        await onAddCandidate(newCandidate)
      } catch (error) {
        console.error("Errore durante l'elaborazione del CV:", error)
        alert(`Errore nell'elaborazione di ${file.name}: ${error.message}`)
      } finally {
        // Rimuovi dai file in elaborazione
        setProcessingFiles(prev => prev.filter(f => f.id !== tempId))
      }
    })

    await Promise.all(uploadPromises)
  }

  // Rende colorato il badge del matching score
  const getScoreColorClass = (score) => {
    if (score >= 80) return 'score-high'
    if (score >= 60) return 'score-medium'
    return 'score-low'
  }

  // Esporta in PDF
  const handlePrintJob = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job Description - ${job.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #e30613; padding-bottom: 20px; margin-bottom: 30px; }
            .brand-name { font-size: 26px; font-weight: 800; color: #000; margin: 0; }
            .brand-sub { font-size: 11px; color: #e30613; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
            .logo-img { height: 50px; }
            .job-title { font-size: 22px; font-weight: bold; margin: 0 0 10px 0; }
            .meta-info { font-size: 13px; color: #555; margin-bottom: 24px; background: #f8f9fa; padding: 10px 14px; border-left: 3px solid #000; }
            .section-title { font-size: 15px; font-weight: bold; color: #e30613; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; }
            .content-box { font-size: 14px; white-space: pre-wrap; margin-bottom: 28px; }
            .footer { margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand-name">todos.it</div>
              <div class="brand-sub">born to be wireless</div>
            </div>
            <img class="logo-img" src="/todos-logo.jpg" onerror="this.src='/todos-logo.png'; this.onerror=null;" alt="Todos Logo" />
          </div>
          <h1 class="job-title">${job.title}</h1>
          <div class="meta-info">
            <strong>Dipartimento:</strong> ${job.department} &nbsp;|&nbsp; <strong>Stato Ricerca:</strong> ${job.status === 'Open' ? 'Attiva' : 'Chiusa'}
          </div>
          <div class="section-title">Job Description</div>
          <div class="content-box">${job.description}</div>
          ${job.requirements ? `
            <div class="section-title">Requisiti Richiesti</div>
            <div class="content-box">${job.requirements}</div>
          ` : ''}
          <div class="footer">Todos.it Telecomunicazioni - Selezione Riservata Interna</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {/* Board Header Branded */}
      <div className="glass-panel" style={{
        padding: '12px 24px',
        borderBottom: '1.5px solid var(--border-color)',
        background: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={onBack}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowLeft size={14} />
            </button>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{job.department}</span>
                <span className={`badge ${job.status === 'Open' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>
                  {job.status === 'Open' ? 'Attiva' : 'Chiusa'}
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {job.title}
              </h2>
            </div>
          </div>

          {/* Toggle Vista & Azioni */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle Switch */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.03)',
              padding: '2px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  background: viewMode === 'kanban' ? 'var(--primary)' : 'none',
                  color: viewMode === 'kanban' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <LayoutGrid size={12} />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? 'var(--primary)' : 'none',
                  color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Table size={12} />
                <span>Compatta</span>
              </button>
            </div>

            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onClick={() => setIsDescExpanded(!isDescExpanded)}
            >
              <span>{isDescExpanded ? 'Chiudi' : 'Info Ruolo'}</span>
              {isDescExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 10px', gap: '4px' }}
              onClick={handlePrintJob}
            >
              <FileText size={12} />
              <span>Esporta PDF</span>
            </button>
            
            <button 
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
              onClick={() => onEditJob(job)}
            >
              Modifica
            </button>
          </div>
        </div>

        {/* Expandable Info */}
        {isDescExpanded && (
          <div style={{
            marginTop: '6px',
            padding: '12px',
            background: 'rgba(0,0,0,0.01)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            lineHeight: '1.4'
          }}>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{job.description}</p>
            {job.requirements && (
              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}><strong>Requisiti:</strong>\n{job.requirements}</p>
            )}
          </div>
        )}
      </div>

      {/* CV Drop Zone Panel */}
      <div style={{ padding: '12px 24px 0 24px' }}>
        <div 
          className="dropzone"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(227, 6, 19, 0.12)' }}
          onDragLeave={(e) => { e.currentTarget.style.background = 'var(--primary-light)' }}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '10px' }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept="application/pdf" 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <Upload size={18} style={{ color: 'var(--primary)' }} />
          <div>
            <span className="dropzone-text">RILASCIO CV MASSIVO (Trascina qui uno o più PDF o clicca per caricare)</span>
            <span className="dropzone-subtext" style={{ display: 'block', marginTop: '1px' }}>
              L'AI leggerà ed estrarrà i candidati in parallelo, calcolando il matching per ciascuno.
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODES RENDERING */}
      {viewMode === 'table' ? (
        
        /* 1. VISTA TABELLA (COMPATTA A RIGHE) */
        <div style={{ padding: '0 24px 24px 24px', overflowY: 'auto', flexGrow: 1 }}>
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
            {jobCandidates.length > 0 ? (
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Nome Candidato</th>
                    <th>Match Score</th>
                    <th>Fase Corrente</th>
                    <th>Email</th>
                    <th>Telefono</th>
                    <th>Ruolo dichiarati</th>
                    <th>Interazioni</th>
                    <th style={{ textAlign: 'right' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCandidates.map(candidate => (
                    <tr 
                      key={candidate.id} 
                      onClick={() => onSelectCandidate(candidate)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {candidate.name}
                      </td>
                      <td>
                        <span className={`badge ${getScoreColorClass(candidate.fit_score)}`}>
                          {candidate.fit_score}% AI
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          {candidate.stage}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {candidate.email || '-'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {candidate.phone || '-'}
                      </td>
                      <td style={{
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-muted)'
                      }}>
                        {candidate.ruolo_attuale || '-'}
                      </td>
                      <td>
                        <span className="badge badge-warning" style={{ textTransform: 'none' }}>
                          {candidate.stato_interazione || 'Da contattare'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => onSelectCandidate(candidate)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Dettaglio
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Eliminare il candidato ${candidate.name}?`)) {
                                onDeleteCandidate(candidate.id)
                              }
                            }}
                            className="btn btn-danger"
                            style={{ padding: '4px 6px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <User size={30} style={{ marginBottom: '10px', opacity: 0.4, color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Nessun candidato associato
                </h3>
                <p style={{ fontSize: '0.78rem' }}>
                  Rilascia i CV in PDF nella dropzone in alto per popolare la lista.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        
        /* 2. VISTA KANBAN COMPATTA */
        <div className="kanban-container" style={{ padding: '0 24px 24px 24px' }}>
          {COLUMNS.map(col => {
            const colCandidates = jobCandidates.filter(c => c.stage === col.id)
            const isOver = dragOverCol === col.id

            return (
              <div 
                key={col.id} 
                className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{ flex: '0 0 200px' /* Più stretto e compatto */ }}
              >
                {/* Column Header */}
                <div className="kanban-column-header">
                  <span className="kanban-column-title" style={{ fontSize: '0.78rem' }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: col.color,
                      display: 'inline-block'
                    }} />
                    {col.name}
                  </span>
                  <span className="kanban-card-count" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                    {colCandidates.length}
                  </span>
                </div>

                {/* Cards Wrapper */}
                <div className="kanban-cards-wrapper">
                  
                  {/* Loaders paralleli */}
                  {col.id === 'Nuovi CV' && processingFiles.map(file => (
                    <div key={file.id} className="glass-panel animate-fade-in" style={{
                      border: '1px dashed var(--primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <FileText size={12} className="spinner" style={{ color: 'var(--primary)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          {file.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>
                        <Sparkles size={10} className="spinner" />
                        <span>{file.status}</span>
                      </div>
                    </div>
                  ))}

                  {/* Cards */}
                  {colCandidates.length > 0 ? (
                    colCandidates.map(candidate => (
                      <div
                        key={candidate.id}
                        id={`candidate-card-${candidate.id}`}
                        className="candidate-card animate-fade-in"
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                        onDragEnd={(e) => handleDragEnd(e, candidate.id)}
                        onClick={() => onSelectCandidate(candidate)}
                        style={{ padding: '8px' }}
                      >
                        <div>
                          <h4 className="candidate-card-name" style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.78rem'
                          }}>
                            {candidate.name}
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span className={`badge ${getScoreColorClass(candidate.fit_score)}`} style={{ fontSize: '0.6rem', padding: '1px 3px' }}>
                              {candidate.fit_score}% AI
                            </span>
                            <span className="badge badge-warning" style={{ fontSize: '0.58rem', padding: '1px 3px', textTransform: 'none' }}>
                              {candidate.stato_interazione || 'Da chiamare'}
                            </span>
                          </div>
                        </div>

                        <div className="candidate-card-footer" style={{ marginTop: '6px', paddingTop: '4px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            📞 {candidate.phone ? 'Sì' : 'No'}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Eliminare ${candidate.name}?`)) {
                                onDeleteCandidate(candidate.id)
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    !processingFiles.length && (
                      <div style={{
                        textAlign: 'center',
                        padding: '16px 5px',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem'
                      }}>
                        Nessuno
                      </div>
                    )
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
