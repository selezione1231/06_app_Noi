import React, { useState, useMemo } from 'react'
import { ClipboardList, Check, X, Clock, FilterX } from 'lucide-react'
import { WP_COLORS, wpButton, wpBadge, wpTableHeader } from '../shared/wpStyles'
import { WP_LEAVE_REQUESTS, WP_EMPLOYEES } from '../shared/wpSeed'
import { useSharedState } from '../../shared/ui'

// ============================================================================
// LeaveRequestsInbox — inbox richieste ferie/permessi del PM
// Vista compatta con filtri per stato, motivo e periodo.
// Persistenza condivisa: l'approvazione vale per tutti (e alimenta i
// conflitti del WeeklyPlanner).
// ============================================================================

const fmtShort = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })

export default function LeaveRequestsInbox({ pmId }) {
  const [requests, setRequests] = useSharedState('wp-leave-requests', WP_LEAVE_REQUESTS)
  const teamIds = useMemo(() => WP_EMPLOYEES.filter(e => e.pm_id === pmId).map(e => e.id), [pmId])

  // Filtri
  const [fStatus, setFStatus] = useState('Tutte')   // Tutte | Pending | Approved | Rejected
  const [fMotivo, setFMotivo] = useState('Tutti')   // Tutti | Ferie | Permesso | <reason_type>
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')

  const mine = requests.filter(r => teamIds.includes(r.employee_id))

  // Opzioni motivo: tipo + motivazioni specifiche presenti nei dati
  const motivoOptions = useMemo(() => {
    const reasons = [...new Set(mine.map(r => r.reason_type).filter(Boolean))]
    return ['Tutti', 'Ferie', 'Permesso', ...reasons]
  }, [mine])

  const filtered = mine.filter(r => {
    if (fStatus !== 'Tutte' && r.status !== fStatus) return false
    if (fMotivo !== 'Tutti') {
      const isType = fMotivo === 'Ferie' || fMotivo === 'Permesso'
      if (isType && r.type !== fMotivo) return false
      if (!isType && r.reason_type !== fMotivo) return false
    }
    // Periodo: la richiesta deve sovrapporsi all'intervallo scelto
    if (fFrom && r.date_to < fFrom) return false
    if (fTo && r.date_from > fTo) return false
    return true
  })

  const counts = {
    Tutte: mine.length,
    Pending: mine.filter(r => r.status === 'Pending').length,
    Approved: mine.filter(r => r.status === 'Approved').length,
    Rejected: mine.filter(r => r.status === 'Rejected').length
  }

  const hasFilters = fStatus !== 'Tutte' || fMotivo !== 'Tutti' || fFrom || fTo
  const resetFilters = () => { setFStatus('Tutte'); setFMotivo('Tutti'); setFFrom(''); setFTo('') }

  const setStatus = (id, status) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r))
  }

  const statusBadge = (s) => {
    if (s === 'Approved') return wpBadge(WP_COLORS.success)
    if (s === 'Rejected') return wpBadge(WP_COLORS.danger)
    return wpBadge(WP_COLORS.warning, '#713f12')
  }
  const statusLabel = (s) => s === 'Approved' ? 'APPROVATO' : s === 'Rejected' ? 'RIFIUTATO' : 'IN ATTESA'

  const STATUS_CHIPS = [
    { id: 'Tutte',    label: 'Tutte' },
    { id: 'Pending',  label: '⏳ In attesa' },
    { id: 'Approved', label: '✓ Approvate' },
    { id: 'Rejected', label: '✗ Rifiutate' }
  ]

  const td = { padding: '7px 10px', fontSize: '0.8rem' }

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontStyle: 'italic', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ClipboardList size={22} color={WP_COLORS.primary} />
        Richieste Permessi / Ferie
      </h2>

      {/* ── FILTRI ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {STATUS_CHIPS.map(c => {
          const active = fStatus === c.id
          return (
            <button key={c.id} onClick={() => setFStatus(c.id)} style={{
              padding: '5px 11px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${active ? WP_COLORS.primary : WP_COLORS.border}`,
              background: active ? WP_COLORS.primaryLight : 'white',
              color: active ? WP_COLORS.primary : WP_COLORS.textMuted
            }}>
              {c.label} ({counts[c.id]})
            </button>
          )
        })}

        <span style={{ width: 1, height: 22, background: WP_COLORS.border, margin: '0 2px' }} />

        <select value={fMotivo} onChange={e => setFMotivo(e.target.value)} title="Filtra per motivo"
          style={{ padding: '5px 8px', border: `1.5px solid ${fMotivo !== 'Tutti' ? WP_COLORS.primary : WP_COLORS.border}`, borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600, color: WP_COLORS.text, background: 'white', cursor: 'pointer' }}>
          {motivoOptions.map(m => <option key={m} value={m}>{m === 'Tutti' ? 'Motivo: tutti' : m}</option>)}
        </select>

        <label style={{ fontSize: '0.72rem', color: WP_COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
          Dal
          <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)}
            style={{ padding: '4px 6px', border: `1.5px solid ${fFrom ? WP_COLORS.primary : WP_COLORS.border}`, borderRadius: '7px', fontSize: '0.74rem', color: WP_COLORS.text }} />
        </label>
        <label style={{ fontSize: '0.72rem', color: WP_COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
          Al
          <input type="date" value={fTo} onChange={e => setFTo(e.target.value)}
            style={{ padding: '4px 6px', border: `1.5px solid ${fTo ? WP_COLORS.primary : WP_COLORS.border}`, borderRadius: '7px', fontSize: '0.74rem', color: WP_COLORS.text }} />
        </label>

        {hasFilters && (
          <button onClick={resetFilters} title="Azzera filtri" style={{ ...wpButton('ghost', 'sm'), display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
            <FilterX size={13} /> Azzera
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: WP_COLORS.textMuted, fontWeight: 600 }}>
          {filtered.length} di {mine.length} richieste
        </span>
      </div>

      {/* ── TABELLA COMPATTA ── */}
      <div style={{ overflowX: 'auto', border: `1px solid ${WP_COLORS.border}`, borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px', background: 'white' }}>
          <thead>
            <tr>
              <th style={wpTableHeader}>Dipendente</th>
              <th style={wpTableHeader}>Tipo / Motivo</th>
              <th style={wpTableHeader}>Periodo</th>
              <th style={wpTableHeader}>Stato</th>
              <th style={wpTableHeader}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: WP_COLORS.textMuted, fontSize: '0.8rem' }}>
                {hasFilters ? 'Nessuna richiesta corrisponde ai filtri.' : 'Nessuna richiesta.'}
              </td></tr>
            )}
            {filtered.map(r => {
              const emp = WP_EMPLOYEES.find(e => e.id === r.employee_id)
              return (
                <tr key={r.id} className="wp-row-strip">
                  <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{emp?.name}</td>
                  <td style={td}>
                    <span style={{ ...wpBadge(r.type === 'Ferie' ? WP_COLORS.info : '#a855f7'), fontSize: '0.66rem' }}>{r.type}</span>
                    {r.reason_type && <span style={{ fontSize: '0.7rem', color: WP_COLORS.textMuted, marginLeft: 6 }}>{r.reason_type}</span>}
                    {r.motivation && (
                      <span title={r.motivation} style={{ display: 'block', fontSize: '0.7rem', color: WP_COLORS.textMuted, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.motivation}
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {r.date_from === r.date_to ? fmtShort(r.date_from) : `${fmtShort(r.date_from)} → ${fmtShort(r.date_to)}`}
                    <span style={{ fontSize: '0.68rem', color: WP_COLORS.textMuted, marginLeft: 5 }}>
                      {r.full_day ? 'giornata' : (r.time_from ? `${r.time_from}–${r.time_to}` : '')}
                    </span>
                  </td>
                  <td style={td}><span style={{ ...statusBadge(r.status), fontSize: '0.66rem' }}>{statusLabel(r.status)}</span></td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {r.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setStatus(r.id, 'Approved')} style={{ ...wpButton('success', 'sm'), padding: '4px 8px' }} title="Approva">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setStatus(r.id, 'Rejected')} style={{ ...wpButton('danger', 'sm'), padding: '4px 8px' }} title="Rifiuta">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setStatus(r.id, 'Pending')} style={{ ...wpButton('ghost', 'sm'), padding: '4px 8px' }} title="Riporta in attesa">
                        <Clock size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
