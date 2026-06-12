import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, X, Search as SearchIcon, Sparkles } from 'lucide-react'
import { filterTreeByRoles, ROLE_LABELS } from '../../lib/navigation'
import CompanySwitcher from './CompanySwitcher'

// ============================================================================
// Sidebar — navigazione principale di Todos Hub
// ----------------------------------------------------------------------------
// Props:
//   - userRoles       : string[]            (es. ['employee','pm'])
//   - currentItemId   : string              (id voce attiva)
//   - onNavigate(item): callback selezione voce
//   - collapsed       : boolean
//   - onToggleCollapse: callback
//   - mobileOpen      : boolean (drawer mobile)
//   - onCloseMobile   : callback
//   - onOpenSearch    : callback (Cmd+K)
// ============================================================================

const COLLAPSED_W = 64
const EXPANDED_W  = 248

export default function Sidebar({
  userRoles = [],
  currentItemId,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  onOpenSearch,
  activeCompanyId,
  onCompanySelect
}) {
  const tree = useMemo(() => filterTreeByRoles(userRoles), [userRoles])

  // Stato collasso per ogni macro-area (di default aperte)
  const [openAreas, setOpenAreas] = useState(() => {
    try {
      const s = localStorage.getItem('todos-hub-sidebar-areas')
      return s ? JSON.parse(s) : {}
    } catch { return {} }
  })
  useEffect(() => {
    localStorage.setItem('todos-hub-sidebar-areas', JSON.stringify(openAreas))
  }, [openAreas])

  // Apri automaticamente l'area che contiene l'item attivo
  useEffect(() => {
    if (!currentItemId) return
    for (const node of tree) {
      if (node.type === 'area') {
        const hasActive = (node.groups || []).some(g => (g.items || []).some(i => i.id === currentItemId))
        if (hasActive) setOpenAreas(prev => ({ ...prev, [node.id]: true }))
      }
    }
  }, [currentItemId, tree])

  const toggleArea = (id) => setOpenAreas(prev => ({ ...prev, [id]: !prev[id] }))

  const width = collapsed ? COLLAPSED_W : EXPANDED_W

  const sidebarStyle = {
    width: `${width}px`,
    minWidth: `${width}px`,
    background: 'var(--bg-sidebar, white)',
    borderRight: '1px solid var(--border-color, #e2e8f0)',
    height: '100vh',
    position: 'sticky',
    top: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'width 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50
  }

  const mobileOverlayStyle = mobileOpen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 90
  } : { display: 'none' }

  const mobileDrawerStyle = mobileOpen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '280px',
    height: '100vh',
    background: 'var(--bg-sidebar, white)',
    zIndex: 100,
    overflowY: 'auto',
    boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column'
  } : null

  // --- Render shared content (per desktop e mobile drawer) -----------------
  const renderContent = (forceExpanded = false) => {
    const isCollapsed = !forceExpanded && collapsed
    return (
      <>
        {/* Header sidebar (logo + toggle) */}
        <div style={{
          padding: isCollapsed ? '12px 8px' : '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          minHeight: '56px'
        }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/todos-logo.png" alt="Todos" style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                onError={(e) => { e.target.style.display = 'none' }} />
              <div>
                <div style={{ fontFamily: 'var(--font-display, inherit)', fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.1 }}>
                  Noi Todos.it
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  azienda integrata
                </div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <img src="/todos-logo.png" alt="Todos" style={{ width: '28px', height: '28px', borderRadius: '50%' }}
              onError={(e) => { e.target.style.display = 'none' }} />
          )}
          {forceExpanded && onCloseMobile && (
            <button onClick={onCloseMobile} style={iconBtnStyle}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Company Switcher */}
        {onCompanySelect && (
          <CompanySwitcher
            userRoles={userRoles}
            activeCompanyId={activeCompanyId}
            onSelect={onCompanySelect}
            collapsed={isCollapsed}
          />
        )}

        {/* Quick action: Search ⌘K */}
        <div style={{ padding: isCollapsed ? '8px' : '10px 12px' }}>
          <button
            onClick={onOpenSearch}
            title={isCollapsed ? 'Cerca (Ctrl+K)' : ''}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? 0 : '8px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '8px' : '8px 10px',
              background: 'var(--bg-alt, #f1f5f9)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              color: 'var(--text-muted, #64748b)',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <SearchIcon size={14} />
            {!isCollapsed && (
              <>
                <span style={{ flex: 1, textAlign: 'left' }}>Cerca...</span>
                <kbd style={{
                  fontSize: '0.6rem', padding: '1px 4px', border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '3px', background: 'white', color: 'var(--text-muted, #64748b)'
                }}>⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Tree */}
        <nav style={{ flex: 1, padding: '4px 0' }}>
          {tree.map(node => (
            <SidebarNode
              key={node.id}
              node={node}
              collapsed={isCollapsed}
              currentItemId={currentItemId}
              openAreas={openAreas}
              onToggleArea={toggleArea}
              onNavigate={(item) => { onNavigate(item); if (forceExpanded && onCloseMobile) onCloseMobile() }}
            />
          ))}
        </nav>

        {/* Footer collapse toggle (solo desktop) */}
        {!forceExpanded && (
          <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '8px' }}>
            <button onClick={onToggleCollapse} style={{ ...iconBtnStyle, width: '100%', justifyContent: 'center' }}>
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!isCollapsed && <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>Comprimi</span>}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={sidebarStyle} className="todos-hub-sidebar-desktop">
        {renderContent(false)}
      </aside>

      {/* Mobile drawer */}
      <div style={mobileOverlayStyle} onClick={onCloseMobile} />
      {mobileOpen && (
        <aside style={mobileDrawerStyle} className="todos-hub-sidebar-mobile">
          {renderContent(true)}
        </aside>
      )}
    </>
  )
}

// ----------------------------------------------------------------------------
// SidebarNode — renderizza un singolo nodo (item o area collassabile)
// ----------------------------------------------------------------------------
function SidebarNode({ node, collapsed, currentItemId, openAreas, onToggleArea, onNavigate }) {
  if (node.type === 'item') {
    const active = node.id === currentItemId
    return (
      <NavRow
        item={node}
        active={active}
        collapsed={collapsed}
        depth={0}
        onClick={() => onNavigate(node)}
      />
    )
  }

  // Area
  const isOpen = openAreas[node.id] !== false
  const Icon = node.icon
  const hasActiveChild = (node.groups || []).some(g => (g.items || []).some(i => i.id === currentItemId))

  if (collapsed) {
    // In modalità compressa, mostro solo le voci come icone (no area header)
    return (
      <div>
        {(node.groups || []).flatMap(g => g.items || []).map(item => (
          <NavRow
            key={item.id}
            item={item}
            active={item.id === currentItemId}
            collapsed
            depth={0}
            onClick={() => onNavigate(item)}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '2px' }}>
      <button
        onClick={() => onToggleArea(node.id)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: hasActiveChild ? 'var(--primary, #A82238)' : 'var(--text-primary, #1e293b)',
          fontWeight: 800,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'left'
        }}
      >
        {Icon && <Icon size={14} />}
        <span style={{ flex: 1 }}>{node.label}</span>
        <ChevronDown
          size={12}
          style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
        />
      </button>

      {isOpen && (node.groups || []).map(group => (
        <div key={group.id} style={{ marginBottom: '6px' }}>
          {group.label && (
            <div style={{
              fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '4px 16px 2px 32px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700
            }}>
              {group.label}
            </div>
          )}
          {(group.items || []).map(item => (
            <NavRow
              key={item.id}
              item={item}
              active={item.id === currentItemId}
              collapsed={false}
              depth={1}
              onClick={() => onNavigate(item)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------------------
// NavRow — singola voce navigabile
// ----------------------------------------------------------------------------
function NavRow({ item, active, collapsed, depth = 0, onClick }) {
  const Icon = item.icon
  const isComingSoon = item.comingSoon
  const isLegacy = item.legacy

  const baseStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '10px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '10px 8px' : `8px 16px 8px ${16 + depth * 16}px`,
    background: active ? 'var(--primary-light, #fce4e8)' : 'transparent',
    border: 'none',
    borderLeft: active ? '3px solid var(--primary, #A82238)' : '3px solid transparent',
    cursor: isComingSoon ? 'not-allowed' : 'pointer',
    color: active ? 'var(--primary, #A82238)' : isComingSoon ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary, #1e293b)',
    fontWeight: active ? 700 : 500,
    fontSize: '0.82rem',
    textAlign: 'left',
    opacity: isComingSoon ? 0.55 : 1,
    transition: 'background 0.1s'
  }

  return (
    <button
      onClick={isComingSoon ? undefined : onClick}
      title={collapsed ? item.label : (isComingSoon ? `${item.label} — In costruzione` : '')}
      style={baseStyle}
      onMouseEnter={(e) => { if (!active && !isComingSoon) e.currentTarget.style.background = 'var(--bg-alt, #f1f5f9)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {Icon && <Icon size={collapsed ? 18 : 15} />}
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
          {isLegacy && !isComingSoon && (
            <span title="Modulo originario" style={{
              fontSize: '0.55rem', padding: '1px 4px', background: '#fef9c3', color: '#713f12',
              borderRadius: '3px', fontWeight: 800
            }}>v1</span>
          )}
          {isComingSoon && (
            <span title="In costruzione" style={{
              fontSize: '0.55rem', padding: '1px 4px', background: '#e0e7ff', color: '#3730a3',
              borderRadius: '3px', fontWeight: 800
            }}>
              soon
            </span>
          )}
        </>
      )}
    </button>
  )
}

const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '6px',
  color: 'var(--text-primary, #1e293b)',
  cursor: 'pointer',
  padding: '6px 8px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
}
