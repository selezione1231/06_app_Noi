import React from 'react'
import { Menu } from 'lucide-react'
import { MOBILE_BOTTOM_NAV } from '../../lib/navigation'

// ============================================================================
// BottomNav — bottom bar mobile con le 4 voci essenziali + hamburger
// Visibile solo sotto a 768px (controllato da CSS media query)
// ============================================================================

export default function BottomNav({ currentItemId, onNavigate, onOpenSidebar, userRoles = [] }) {
  const items = MOBILE_BOTTOM_NAV.filter(i => i.roles.some(r => userRoles.includes(r)))

  return (
    <nav className="todos-hub-bottom-nav" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: '60px',
      background: 'var(--bg-sidebar, white)',
      borderTop: '1px solid var(--border-color, #e2e8f0)',
      display: 'none',
      alignItems: 'stretch',
      justifyContent: 'space-around',
      zIndex: 80,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.06)'
    }}>
      <button onClick={onOpenSidebar} style={btnStyle(false)}>
        <Menu size={20} />
        <span style={lblStyle}>Menu</span>
      </button>
      {items.map(it => {
        const Icon = it.icon
        const active = it.id === currentItemId
        return (
          <button
            key={it.id}
            onClick={() => onNavigate({ id: it.id })}
            style={btnStyle(active)}
          >
            <Icon size={20} />
            <span style={lblStyle}>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const btnStyle = (active) => ({
  flex: 1,
  background: 'transparent',
  border: 'none',
  color: active ? 'var(--primary, #A82238)' : 'var(--text-muted, #64748b)',
  fontWeight: active ? 800 : 500,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  borderTop: active ? '3px solid var(--primary, #A82238)' : '3px solid transparent'
})
const lblStyle = { fontSize: '0.65rem', letterSpacing: '0.03em' }
