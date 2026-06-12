import React, { useState } from 'react'
import { Search, Briefcase, Eye, Trash2, Edit3, Users, Clock, CheckCircle, FileText, FolderArchive, FileCode, Play, Plus } from 'lucide-react'

export default function Dashboard({ 
  jobs, 
  candidates, 
  jobTemplates, 
  onSelectJob, 
  onEditJob, 
  onDeleteJob, 
  onSaveJob,
  onDeleteTemplate,
  onStartSearchFromTemplate,
  activeTab, // 'active' | 'archived' | 'templates'
  onOpenJobModal
}) {
  const [searchTerm, setSearchTerm] = useState('')

  // Calcolo statistiche per le schede in alto
  const activeJobsCount = jobs.filter(j => j.status === 'Open').length
  const totalCandidatesCount = candidates.length
  const plannedInterviewsCount = candidates.filter(c => c.stage === 'Colloquio').length
  const hiredCount = candidates.filter(c => c.stage === 'Assunto' || c.stage === 'Assunto/Inserito').length

  // Filtra ricerche in base al tab selezionato
  let displayedItems = []
  if (activeTab === 'active') {
    displayedItems = jobs.filter(j => j.status === 'Open')
  } else if (activeTab === 'archived') {
    displayedItems = jobs.filter(j => j.status === 'Closed')
  } else if (activeTab === 'templates') {
    displayedItems = jobTemplates || []
  }

  // Filtra per termine di ricerca
  const filteredItems = displayedItems.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCandidateCountForJob = (jobId) => {
    return candidates.filter(c => c.job_id === jobId).length
  }

  // Esporta in PDF stampabile
  const handleExportPDF = (job, e) => {
    e.stopPropagation()
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      alert("Abilita i pop-up per esportare la Job Description.")
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job Description - ${job.title}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d90429; padding-bottom: 20px; margin-bottom: 30px; }
            .brand-name { font-size: 26px; font-weight: 800; color: #000; margin: 0; }
            .brand-sub { font-size: 11px; color: #d90429; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
            .logo-img { height: 50px; }
            .job-title { font-size: 22px; font-weight: 700; color: #000; margin: 0 0 10px 0; }
            .meta-info { font-size: 13px; color: #555; margin-bottom: 24px; background: #f8f9fa; padding: 10px 14px; border-left: 3px solid #000; }
            .section-title { font-size: 15px; font-weight: bold; color: #d90429; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; }
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
            <strong>Dipartimento:</strong> ${job.department} &nbsp;|&nbsp; <strong>Stato:</strong> ${job.isTemplate ? 'Template' : (job.status === 'Open' ? 'Attiva' : 'Archiviata')}
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

  // Definisce intestazione e icone del tab
  const getTabHeader = () => {
    switch (activeTab) {
      case 'active':
        return {
          title: '📋 Ricerche Lavorative Attive',
          sub: 'Elenco di tutte le selezioni attualmente in corso in Todos.it. Trascina i CV o apri la Board per gestire l\'avanzamento.',
          emptyText: 'Nessuna ricerca attiva al momento. Clicca su "+ Nuova Ricerca" in alto per iniziare.',
          icon: <Briefcase size={28} style={{ color: 'var(--primary)' }} />
        }
      case 'archived':
        return {
          title: '🗄️ Archivio Ricerche Concluse',
          sub: 'Storico di tutte le ricerche chiuse. I candidati e le note delle interazioni rimangono archiviati e riapribili in ogni momento.',
          emptyText: 'L\'archivio delle ricerche è vuoto.',
          icon: <FolderArchive size={28} style={{ color: 'var(--text-muted)' }} />
        }
      case 'templates':
        return {
          title: '📂 Anagrafica & Template Ricerche',
          sub: 'Modelli pre-impostati di Job Description per ruoli ricorrenti. Crea istantaneamente una ricerca attiva a partire da un template.',
          emptyText: 'Non ci sono template salvati in anagrafica. Clicca su "+ Nuova Ricerca" in alto e seleziona "Template" per crearne uno.',
          icon: <FileCode size={28} style={{ color: 'var(--primary)' }} />
        }
      default:
        return {}
    }
  }

  const tabInfo = getTabHeader()

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* Title block */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '16px',
        marginBottom: '24px',
        animation: 'fadeIn 0.15s ease'
      }}>
        {tabInfo.icon}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
            {tabInfo.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {tabInfo.sub}
          </p>
        </div>
      </div>

      {/* STATS STRIP */}
      {activeTab === 'active' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ricerche Attive
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {activeJobsCount}
              </div>
            </div>
            <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
              <Briefcase size={22} />
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Candidati in Database
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {totalCandidatesCount}
              </div>
            </div>
            <div style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
              <Users size={22} />
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pianificati/Colloquio
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {plannedInterviewsCount}
              </div>
            </div>
            <div style={{ color: 'var(--warning)', opacity: 0.8 }}>
              <Clock size={22} />
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Candidati Assunti
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {hiredCount}
              </div>
            </div>
            <div style={{ color: 'var(--success)', opacity: 0.8 }}>
              <CheckCircle size={22} />
            </div>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={activeTab === 'templates' ? "Cerca template..." : "Cerca ricerca..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>

        {activeTab === 'active' && onOpenJobModal && (
          <button
            className="btn btn-primary"
            onClick={onOpenJobModal}
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              gap: '4px',
              boxShadow: 'var(--shadow-premium)'
            }}
          >
            <Plus size={14} />
            <span>Crea Ricerca</span>
          </button>
        )}
      </div>

      {/* COMPACT TABLE */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        {filteredItems.length > 0 ? (
          <table className="compact-table">
            <thead>
              {activeTab === 'templates' ? (
                <tr>
                  <th>Titolo Template</th>
                  <th>Reparto / Dipartimento</th>
                  <th>Data Creazione</th>
                  <th style={{ textAlign: 'right' }}>Azioni</th>
                </tr>
              ) : (
                <tr>
                  <th>Titolo Posizione</th>
                  <th>Reparto</th>
                  <th>Stato</th>
                  <th>Candidati</th>
                  <th>Data Inizio</th>
                  <th style={{ textAlign: 'right' }}>Azioni</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  style={{ cursor: activeTab === 'templates' ? 'default' : 'pointer' }}
                  onClick={() => activeTab !== 'templates' && onSelectJob(item)}
                >
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                    {item.title}
                  </td>
                  <td>
                    <span className="badge badge-primary">{item.department}</span>
                  </td>
                  
                  {activeTab !== 'templates' && (
                    <>
                      <td>
                        <span className={`badge ${item.status === 'Open' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6rem' }}>
                          {item.status === 'Open' ? 'Attiva' : 'Archiviata'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        👥 {getCandidateCountForJob(item.id)}
                      </td>
                    </>
                  )}

                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.created_at).toLocaleDateString('it-IT')}
                  </td>
                  
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      
                      {activeTab === 'active' && (
                        <>
                          <button 
                            onClick={() => onSelectJob(item)} 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Eye size={12} />
                            <span>Board</span>
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              if (window.confirm(`Vuoi chiudere ed archiviare la ricerca "${item.title}"? Tutti i candidati rimarranno salvati.`)) {
                                onSaveJob({ ...item, status: 'Closed' })
                              }
                            }} 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Archivia ricerca (sposta nel tab Archivio)"
                          >
                            <span>Archivia</span>
                          </button>
                        </>
                      )}

                      {activeTab === 'archived' && (
                        <>
                          <button 
                            onClick={() => onSelectJob(item)} 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Eye size={12} />
                            <span>Vedi Storico</span>
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              onSaveJob({ ...item, status: 'Open' })
                            }} 
                            className="btn btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                            title="Riapri ed attiva questa ricerca"
                          >
                            <Play size={10} />
                            <span>Riapri</span>
                          </button>
                        </>
                      )}

                      {activeTab === 'templates' && (
                        <button 
                          onClick={() => onStartSearchFromTemplate(item)} 
                          className="btn btn-primary" 
                          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          title="Avvia una ricerca attiva pre-compilata da questo modello"
                        >
                          <Play size={10} />
                          <span>Usa Template</span>
                        </button>
                      )}

                      {/* Common Actions */}
                      <button 
                        onClick={(e) => handleExportPDF(item, e)} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px' }}
                        title="Esporta Job Description in PDF"
                      >
                        <FileText size={12} />
                      </button>

                      <button 
                        onClick={() => onEditJob(item)} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px' }}
                        title="Modifica"
                      >
                        <Edit3 size={12} />
                      </button>

                      <button 
                        onClick={() => {
                          if (window.confirm(`Sei sicuro di voler eliminare permanentemente questo record?`)) {
                            if (activeTab === 'templates') {
                              onDeleteTemplate(item.id)
                            } else {
                              onDeleteJob(item.id)
                            }
                          }
                        }} 
                        className="btn btn-danger" 
                        style={{ padding: '4px 6px' }}
                        title="Elimina permanentemente"
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
            <Briefcase size={36} style={{ marginBottom: '12px', opacity: 0.3, color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {activeTab === 'templates' ? 'Nessun template in anagrafica' : 'Nessuna ricerca presente'}
            </h3>
            <p style={{ fontSize: '0.8rem', maxWidth: '400px', margin: '0 auto' }}>
              {tabInfo.emptyText}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
