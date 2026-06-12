import React, { useState, useEffect } from 'react'
import { Building2, Search, Wrench } from 'lucide-react'
import { WP_COLORS, wpInput, wpBadge, wpTableHeader } from '../shared/wpStyles'
import { WP_SITES, WP_CLIENTS } from '../shared/wpSeed'
import { fetchProjects, isLegacyDataAvailable } from '../../../lib/legacyData'

// ============================================================================
// SitesTable — Sottocommesse (ex Cantieri)
// Con login reale legge le sottocommesse importate dal gestionale
// (projects, 6k record, ricerca lato server). In demo usa i seed.
// ============================================================================

export default function SitesTable() {
  const live = isLegacyDataAvailable()
  const [q, setQ] = useState('')
  const [maintOnly, setMaintOnly] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(live)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await fetchProjects({ q, soloManutenzione: maintOnly, includeClosed })
      if (cancelled) return
      if (res) { setRows(res.rows); setTotal(res.total) }
      setLoading(false)
    }, q ? 300 : 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [live, q, maintOnly, includeClosed])

  // Demo: comportamento originale sui seed
  const demoFiltered = WP_SITES.filter(s => {
    const t = q.toLowerCase()
    if (maintOnly && !s.is_maintenance) return false
    if (!t) return true
    const cli = WP_CLIENTS.find(c => c.id === s.client_id)
    return s.code.toLowerCase().includes(t) || s.name.toLowerCase().includes(t) || s.address.toLowerCase().includes(t) || (cli && cli.name.toLowerCase().includes(t))
  })

  return (
    <div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontStyle: 'italic', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building2 size={22} color={WP_COLORS.primary} />
        Sottocommesse
      </h2>
      <p style={{ fontSize: '0.78rem', color: WP_COLORS.textMuted, marginBottom: '16px' }}>
        Le sottocommesse di <strong style={{ color: WP_COLORS.blueSite }}>manutenzione</strong> sono evidenziate in blu.
        {live && ' Dati importati dal gestionale.'}
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: WP_COLORS.textMuted }} />
          <input style={{ ...wpInput, paddingLeft: '32px' }} placeholder="Cerca per codice o descrizione..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={maintOnly} onChange={e => setMaintOnly(e.target.checked)} /> Solo manutenzione
        </label>
        {live && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: WP_COLORS.textMuted }}>
            <input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)} /> mostra anche chiuse/nascoste
          </label>
        )}
        {live && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: WP_COLORS.textMuted, fontWeight: 600 }}>
            {loading ? 'Carico…' : `${rows && rows.length < total ? `prime ${rows.length} di ` : ''}${total.toLocaleString('it-IT')} sottocommesse`}
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${WP_COLORS.border}`, borderRadius: '8px' }}>
        {live && rows ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={wpTableHeader}>Codice</th>
                <th style={wpTableHeader}>Descrizione</th>
                <th style={wpTableHeader}>Cliente</th>
                <th style={wpTableHeader}>Tipo</th>
                <th style={wpTableHeader}>Azienda</th>
                <th style={wpTableHeader}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: WP_COLORS.textMuted, fontSize: '0.8rem' }}>Nessuna sottocommessa trovata.</td></tr>
              )}
              {rows.map(p => (
                <tr key={p.id} className="wp-row-strip" style={p.hidden || p.unused ? { opacity: 0.55 } : undefined}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: p.is_maintenance ? WP_COLORS.blueSite : WP_COLORS.primary, whiteSpace: 'nowrap' }}>
                    {p.is_maintenance && <Wrench size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />}
                    {p.code}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }} title={p.notes || ''}>{p.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{p.client_name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={wpBadge(p.is_maintenance ? WP_COLORS.blueSite : '#64748b')}>{p.type}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{p.company_name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {p.unused
                      ? <span style={wpBadge('#94a3b8')}>INUTILIZZATA</span>
                      : p.hidden
                        ? <span style={wpBadge(WP_COLORS.warning, '#713f12')}>NASCOSTA</span>
                        : <span style={wpBadge(WP_COLORS.success)}>APERTA</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={wpTableHeader}>Codice</th>
                <th style={wpTableHeader}>Nome</th>
                <th style={wpTableHeader}>Cliente</th>
                <th style={wpTableHeader}>Indirizzo</th>
                <th style={wpTableHeader}>Apertura</th>
                <th style={wpTableHeader}>Chiusura</th>
              </tr>
            </thead>
            <tbody>
              {demoFiltered.map(s => {
                const cli = WP_CLIENTS.find(c => c.id === s.client_id)
                return (
                  <tr key={s.id} className="wp-row-strip">
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: s.is_maintenance ? WP_COLORS.blueSite : WP_COLORS.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {s.is_maintenance && <Wrench size={12} />}
                      {s.code}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{cli?.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{s.address}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{s.start_date ? new Date(s.start_date).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.82rem' }}>{s.end_date ? new Date(s.end_date).toLocaleDateString('it-IT') : <em style={{ color: WP_COLORS.textMuted }}>aperto</em>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
