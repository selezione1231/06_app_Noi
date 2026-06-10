import React, { useState } from 'react'
import { FileText, Printer, Download, BarChart3, Users, Calendar, Receipt, Clock, FileSpreadsheet, ChevronRight } from 'lucide-react'

// ============================================================================
// ReportsHub — hub centralizzato di stampe e report
// Ogni report ha una funzione di generazione HTML che usa window.print()
// I dati vengono passati come prop dal genitore (App.jsx)
// ============================================================================

const REPORTS = [
  {
    id: 'presence',
    title: 'Report Presenze Mensile',
    desc: 'Riepilogo presenze, ore lavorate e assenze per dipendente in un mese selezionato.',
    icon: Clock,
    color: '#3b82f6',
    params: ['month', 'employee_filter']
  },
  {
    id: 'leaves',
    title: 'Prospetto Ferie e Permessi',
    desc: 'Elenco completo di tutte le ferie e permessi, con stato approvazione.',
    icon: Calendar,
    color: '#059669',
    params: ['date_from', 'date_to']
  },
  {
    id: 'employees',
    title: 'Anagrafica Dipendenti',
    desc: 'Scheda anagrafica completa di tutti i dipendenti attivi con dati contrattuali.',
    icon: Users,
    color: '#7c3aed',
    params: []
  },
  {
    id: 'expenses',
    title: 'Riepilogo Note Spese',
    desc: 'Report delle note spese per periodo, con suddivisione per categoria e stato.',
    icon: Receipt,
    color: '#d97706',
    params: ['month']
  },
  {
    id: 'expiries',
    title: 'Report Scadenze',
    desc: 'Tutte le scadenze imminenti: documenti, visite mediche, corsi sicurezza, DPI.',
    icon: BarChart3,
    color: '#ef4444',
    params: ['days_ahead']
  },
  {
    id: 'payslip',
    title: 'Busta Paga (simulata)',
    desc: 'Prospetto paga mensile simulato per singolo dipendente.',
    icon: FileSpreadsheet,
    color: '#A82238',
    params: ['employee', 'month']
  }
]

function generatePresenceHTML(employees, leaves, month) {
  const monthLabel = month || new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return `
    <html><head><title>Report Presenze — ${monthLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 24px; }
      h1 { font-size: 18px; color: #A82238; margin-bottom: 4px; }
      .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
      td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) { background: #fafafa; }
      .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
      .ok { background: #dcfce7; color: #16a34a; }
      .warn { background: #fef9c3; color: #ca8a04; }
      .bad { background: #fee2e2; color: #dc2626; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>Report Presenze — ${monthLabel}</h1>
    <div class="subtitle">Generato il ${new Date().toLocaleDateString('it-IT')} · Todos Group</div>
    <table>
      <thead><tr><th>Dipendente</th><th>Reparto</th><th>Contratto</th><th>Assunzione</th><th>Ferie approvate</th><th>Permessi</th></tr></thead>
      <tbody>
        ${employees.map(e => {
          const empLeaves = leaves.filter(l => l.employee_id === e.id && l.status === 'Approved')
          const ferie = empLeaves.filter(l => l.type === 'Ferie').length
          const permessi = empLeaves.filter(l => l.type === 'Permesso').length
          return `<tr>
            <td><strong>${e.name}</strong></td>
            <td>${e.department}</td>
            <td>${e.contract_type}</td>
            <td>${e.hire_date}</td>
            <td><span class="badge ${ferie > 0 ? 'ok' : 'warn'}">${ferie} gg</span></td>
            <td>${permessi} gg</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    </body></html>`
}

function generateEmployeesHTML(employees) {
  return `
    <html><head><title>Anagrafica Dipendenti</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 24px; }
      h1 { font-size: 18px; color: #A82238; margin-bottom: 4px; }
      .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f8fafc; padding: 7px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
      td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) { background: #fafafa; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>Anagrafica Dipendenti</h1>
    <div class="subtitle">Generato il ${new Date().toLocaleDateString('it-IT')} · ${employees.length} dipendenti attivi</div>
    <table>
      <thead><tr><th>Nome</th><th>Email</th><th>Telefono</th><th>Reparto</th><th>Ruolo</th><th>Contratto</th><th>Assunzione</th><th>RAL</th></tr></thead>
      <tbody>
        ${employees.map(e => `<tr>
          <td><strong>${e.name}</strong></td>
          <td>${e.email}</td>
          <td>${e.phone || '—'}</td>
          <td>${e.department}</td>
          <td>${e.role}</td>
          <td>${e.contract_type}</td>
          <td>${e.hire_date}</td>
          <td>${e.ral ? `€${e.ral.toLocaleString('it-IT')}` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`
}

function generateExpensesHTML(expenses, month) {
  const monthLabel = month || new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const approved = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.amount || 0), 0)
  const pending = expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + (e.amount || 0), 0)
  return `
    <html><head><title>Note Spese — ${monthLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 24px; }
      h1 { font-size: 18px; color: #A82238; margin-bottom: 4px; }
      .subtitle { color: #64748b; font-size: 11px; margin-bottom: 12px; }
      .kpi { display: flex; gap: 20px; margin-bottom: 20px; }
      .kpi-box { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
      .kpi-val { font-size: 20px; font-weight: bold; color: #A82238; }
      .kpi-lbl { font-size: 10px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f8fafc; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
      td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
      .approved { color: #16a34a; font-weight: bold; }
      .pending { color: #d97706; font-weight: bold; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>Note Spese — ${monthLabel}</h1>
    <div class="subtitle">Generato il ${new Date().toLocaleDateString('it-IT')} · Todos Group</div>
    <div class="kpi">
      <div class="kpi-box"><div class="kpi-val">€${total.toFixed(2)}</div><div class="kpi-lbl">Totale</div></div>
      <div class="kpi-box"><div class="kpi-val" style="color:#16a34a">€${approved.toFixed(2)}</div><div class="kpi-lbl">Approvate</div></div>
      <div class="kpi-box"><div class="kpi-val" style="color:#d97706">€${pending.toFixed(2)}</div><div class="kpi-lbl">In attesa</div></div>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Dipendente</th><th>Categoria</th><th>Commerciante</th><th>Importo</th><th>Stato</th></tr></thead>
      <tbody>
        ${expenses.map(e => `<tr>
          <td>${e.expense_date}</td>
          <td>${e.employee_name}</td>
          <td>${e.category}</td>
          <td>${e.merchant}</td>
          <td>€${(e.amount || 0).toFixed(2)}</td>
          <td class="${e.status === 'Approved' ? 'approved' : 'pending'}">${e.status === 'Approved' ? 'Approvata' : 'In attesa'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </body></html>`
}

function generatePayslipHTML(employee, month) {
  const monthLabel = month || new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  if (!employee) return '<html><body>Dipendente non trovato</body></html>'
  const gross = (employee.ral || 30000) / 12
  const inps = gross * 0.0919
  const irpef = gross * 0.23
  const net = gross - inps - irpef
  return `
    <html><head><title>Busta Paga — ${employee.name} — ${monthLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 24px; max-width: 700px; }
      h1 { font-size: 16px; color: #A82238; margin-bottom: 2px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
      .company { font-size: 10px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f8fafc; padding: 7px 10px; text-align: left; font-size: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
      td { padding: 7px 10px; border-bottom: 1px solid #f9f9f9; }
      .total { font-weight: bold; font-size: 14px; color: #A82238; }
      .note { font-size: 9px; color: #94a3b8; margin-top: 12px; font-style: italic; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <div>
        <h1>Cedolino Paga</h1>
        <div class="company">Todos S.r.l. · P.IVA 01234567890</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:bold">${monthLabel}</div>
        <div class="company">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
      </div>
    </div>
    <table>
      <tr><th colspan="2">Dati Dipendente</th></tr>
      <tr><td>Nome</td><td>${employee.name}</td></tr>
      <tr><td>Reparto</td><td>${employee.department}</td></tr>
      <tr><td>Ruolo</td><td>${employee.role}</td></tr>
      <tr><td>Contratto</td><td>${employee.contract_type}</td></tr>
      <tr><td>Data Assunzione</td><td>${employee.hire_date}</td></tr>
    </table>
    <table>
      <tr><th>Voce</th><th style="text-align:right">Importo (€)</th></tr>
      <tr><td>Stipendio lordo mensile</td><td style="text-align:right">${gross.toFixed(2)}</td></tr>
      <tr><td style="color:#ef4444">Contributi INPS dipendente (9.19%)</td><td style="text-align:right;color:#ef4444">-${inps.toFixed(2)}</td></tr>
      <tr><td style="color:#ef4444">IRPEF stimata (23%)</td><td style="text-align:right;color:#ef4444">-${irpef.toFixed(2)}</td></tr>
      <tr style="border-top:2px solid #e2e8f0"><td class="total">NETTO IN BUSTA</td><td class="total" style="text-align:right">€ ${net.toFixed(2)}</td></tr>
    </table>
    <div class="note">* Cedolino simulato a scopo dimostrativo. I valori fiscali e contributivi reali possono variare in base a scaglioni IRPEF, detrazioni e CCNL applicato.</div>
    </body></html>`
}

export default function ReportsHub({ employees = [], leaves = [], expenses = [] }) {
  const [selectedReport, setSelectedReport] = useState(null)
  const [params, setParams] = useState({ employee: '', month: '', date_from: '', date_to: '', days_ahead: '30' })

  const handlePrint = (reportId) => {
    let html = ''
    switch (reportId) {
      case 'presence':
        html = generatePresenceHTML(employees, leaves, params.month)
        break
      case 'employees':
        html = generateEmployeesHTML(employees)
        break
      case 'expenses':
        html = generateExpensesHTML(expenses, params.month)
        break
      case 'payslip': {
        const emp = employees.find(e => e.id === params.employee) || employees[0]
        html = generatePayslipHTML(emp, params.month)
        break
      }
      case 'leaves':
        html = generatePresenceHTML(employees, leaves, `${params.date_from} → ${params.date_to}`)
        break
      case 'expiries':
        html = generateEmployeesHTML(employees)
        break
      default:
        html = '<html><body>Report non disponibile</body></html>'
    }

    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        <FileText size={30} style={{ color: 'var(--primary, #A82238)', marginTop: 2 }} />
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>Report & Stampe</h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.84rem', margin: '4px 0 0' }}>
            Genera e stampa report PDF direttamente dal browser. I dati provengono dal sistema in tempo reale.
          </p>
        </div>
      </div>

      {/* Griglia report */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {REPORTS.map(report => {
          const Icon = report.icon
          const isSelected = selectedReport === report.id
          return (
            <div
              key={report.id}
              style={{
                background: 'white', border: `1.5px solid ${isSelected ? report.color : 'var(--border-color, #e2e8f0)'}`,
                borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px',
                cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: isSelected ? `0 0 0 3px ${report.color}20` : 'none'
              }}
              onClick={() => setSelectedReport(isSelected ? null : report.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '9px', background: report.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: report.color }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #1e293b)', flex: 1 }}>{report.title}</div>
                <ChevronRight size={14} style={{ color: '#94a3b8', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #475569)' }}>{report.desc}</div>

              {isSelected && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={e => e.stopPropagation()}>
                  {/* Parametri specifici */}
                  {report.params.includes('month') && (
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Mese di riferimento</label>
                      <input type="month" value={params.month} onChange={e => setParams(p => ({ ...p, month: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }} />
                    </div>
                  )}
                  {report.params.includes('employee') && (
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dipendente</label>
                      <select value={params.employee} onChange={e => setParams(p => ({ ...p, employee: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem', background: 'white' }}>
                        <option value="">Tutti / Primo disponibile</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  )}
                  {report.params.includes('date_from') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dal</label>
                        <input type="date" value={params.date_from} onChange={e => setParams(p => ({ ...p, date_from: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.8rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Al</label>
                        <input type="date" value={params.date_to} onChange={e => setParams(p => ({ ...p, date_to: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.8rem' }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handlePrint(report.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px', background: report.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px' }}
                  >
                    <Printer size={15} /> Genera e Stampa PDF
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Note info */}
      <div style={{ marginTop: '24px', padding: '14px 18px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', fontSize: '0.78rem', color: '#0369a1' }}>
        <strong>Come funziona:</strong> Clicca su un report per espandere i parametri, poi usa "Genera e Stampa PDF" — si aprirà una finestra di anteprima con la stampa del browser (⌘P / Ctrl+P). Per salvare come PDF scegli "Salva come PDF" come stampante.
      </div>
    </div>
  )
}
