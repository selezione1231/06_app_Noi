import React, { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Check, Users } from 'lucide-react'
import {
  COMPANIES, ALL_COMPANIES_SENTINEL, canSeeAllCompanies
} from '../../lib/multitenancy'

// ============================================================================
// CompanySwitcher — dropdown per selezionare l'azienda attiva nel gruppo
// Mostrato nella sidebar sotto il logo, visibile solo ad admin/direzione
// ============================================================================

export default function CompanySwitcher({ userRoles = [], activeCompanyId, onSelect, collapsed = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const canAll = canSeeAllCompanies(userRoles)
  const options = canAll ? [ALL_COMPANIES_SENTINEL, ...COMPANIES] : COMPANIES

  const active = options.find(c => c.id === activeCompanyId) || COMPANIES[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (collapsed) {
    return (
      <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'center' }}>
        <div
          title={active.name}
          style={{
            width: 28, height: 28, borderRadius: '6px',
            background: active.color + '22',
            border: `1.5px solid ${active.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: active.color, fontWeight: 800, fontSize: '0.65rem'
          }}
          onClick={() => setOpen(v => !v)}
        >
          {active.code.slice(0, 2)}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ padding: '6px 10px', position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 10px',
          background: active.color + '12',
          border: `1px solid ${active.color}33`,
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--text-primary, #1e293b)',
          fontSize: '0.78rem',
          fontWeight: 600,
          textAlign: 'left'
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '4px',
          background: active.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.55rem', fontWeight: 800, flexShrink: 0
        }}>
          {active.code.slice(0, 2)}
        </div>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.shortName}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, color: 'var(--text-muted, #94a3b8)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '10px',
          right: '10px',
          background: 'white',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
          overflow: 'hidden',
          marginTop: '4px'
        }}>
          {options.map(company => (
            <button
              key={company.id}
              onClick={() => { onSelect(company.id); setOpen(false) }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                background: company.id === activeCompanyId ? company.color + '10' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '5px',
                background: company.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0
              }}>
                {company.id === ALL_COMPANIES_SENTINEL.id ? <Users size={11} /> : company.code.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {company.name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {company.sector} · {company.employees} dip.
                </div>
              </div>
              {company.id === activeCompanyId && (
                <Check size={13} style={{ color: company.color, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
