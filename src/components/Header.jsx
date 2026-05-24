import React, { useState, useEffect } from 'react'
import { Sun, Moon, LogOut, Database, Award, User, Plus, Cloud } from 'lucide-react'

export default function Header({ user, isDemo, onLogout, onOpenJobModal }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crm-theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('crm-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
      background: 'var(--bg-sidebar)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand Logo & Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          color: 'white',
          boxShadow: '0 2px 6px rgba(217, 4, 41, 0.15)'
        }}>
          <Award size={18} />
        </div>
        <div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.1rem',
            letterSpacing: '-0.02em',
            display: 'block',
            lineHeight: '1.1'
          }}>
            Todos Select
          </span>
          <span style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'block',
            marginTop: '1px'
          }}>
            born to be wireless
          </span>
        </div>
      </div>

      {/* Center Database Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isDemo ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--warning-light)',
            color: 'var(--warning)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: '1px solid rgba(208, 128, 0, 0.2)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--warning)',
              display: 'inline-block',
              boxShadow: '0 0 6px var(--warning)'
            }} />
            <span>DEMO MODE</span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--success-light)',
            color: 'var(--success)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: '1px solid rgba(15, 159, 110, 0.2)'
          }}>
            <Database size={10} />
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              boxShadow: '0 0 6px var(--success)'
            }} />
            <span>SUPABASE CONNESSO</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* + CREA RICERCA BUTTON */}
        <button
          className="btn btn-primary"
          onClick={onOpenJobModal}
          style={{
            padding: '6px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            gap: '4px',
            boxShadow: 'var(--shadow-premium)'
          }}
        >
          <Plus size={14} />
          <span>Crea Ricerca</span>
        </button>

        {/* User profile capsule */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px 4px 6px',
          background: 'rgba(0, 0, 0, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={10} />
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            {user?.email || 'recruiter@todos.it'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '6px'
          }}
        >
          <LogOut size={14} />
          <span>Esci</span>
        </button>
      </div>
    </header>
  )
}
