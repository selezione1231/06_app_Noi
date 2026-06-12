import React, { useMemo, useState } from 'react'
import { Users2, Plus, HardHat, MapPin, Award, Pencil, Trash2, UserCircle2, CheckCircle2, Truck, GripVertical, Star, X } from 'lucide-react'
import {
  ModulePage, ModuleHeader, StatGrid, Card, SectionTitle, Pill, EmptyState,
  Modal, Field, inputStyle, selectStyle, useSharedState, ExportButton
} from '../shared/ui'
import { WP_VEHICLES } from '../workpro/shared/wpSeed'

// ============================================================================
// SquadreModule — gestione squadre operative (Operations → Anagrafiche)
// Composizione squadre via modale O drag & drop dal roster dipendenti.
// Caposquadra promuovibile al volo (⭐), automezzo assegnato per squadra.
// ============================================================================

const OPERAI = [
  { id: 'op-1',  name: 'Gianni Corleto',    role: 'Caposquadra',  skills: ['Giunzione FO', 'Collaudo OTDR'] },
  { id: 'op-2',  name: 'Roberto Corleto',   role: 'Operaio',      skills: ['Posa cavi', 'Scavi'] },
  { id: 'op-3',  name: 'Luca Testa',        role: 'Operaio',      skills: ['Giunzione FO'] },
  { id: 'op-4',  name: 'Marco Ferrari',     role: 'Caposquadra',  skills: ['Posa aerea', 'PLE'] },
  { id: 'op-5',  name: 'Andrea Colombo',    role: 'Operaio',      skills: ['Scavi', 'Minitrincea'] },
  { id: 'op-6',  name: 'Stefano Riva',      role: 'Operaio',      skills: ['Posa cavi', 'Giunzione FO'] },
  { id: 'op-7',  name: 'Davide Moretti',    role: 'Caposquadra',  skills: ['Collaudo OTDR', 'Permessi'] },
  { id: 'op-8',  name: 'Simone Galli',      role: 'Operaio',      skills: ['Posa aerea'] },
  { id: 'op-9',  name: 'Paolo Fontana',     role: 'Operaio',      skills: ['Scavi', 'Ripristini'] },
  { id: 'op-10', name: 'Matteo Sala',       role: 'Operaio',      skills: ['Giunzione FO', 'Collaudo OTDR'] }
]

const CANTIERI = ['BG24043 — Bergamo FTTH', 'BS25124 — Brescia Backbone', 'MI25201 — Milano Citofonia', 'VR25080 — Verona FWA', '— Nessuno —']

const SPECIALIZZAZIONI = ['Posa & Scavi', 'Giunzione & Collaudo', 'Posa aerea', 'Ripristini', 'Mista']

const INITIAL_SQUADS = [
  {
    id: 'sq-1', name: 'Squadra Alfa', specialization: 'Giunzione & Collaudo',
    leader_id: 'op-1', member_ids: ['op-3', 'op-6'], site: 'BG24043 — Bergamo FTTH', status: 'In cantiere', vehicle_id: 'veh-1'
  },
  {
    id: 'sq-2', name: 'Squadra Bravo', specialization: 'Posa & Scavi',
    leader_id: 'op-4', member_ids: ['op-2', 'op-5', 'op-9'], site: 'BS25124 — Brescia Backbone', status: 'In cantiere', vehicle_id: 'veh-2'
  },
  {
    id: 'sq-3', name: 'Squadra Charlie', specialization: 'Posa aerea',
    leader_id: 'op-7', member_ids: ['op-8', 'op-10'], site: '— Nessuno —', status: 'Disponibile', vehicle_id: null
  }
]

const STATUS_CFG = {
  'In cantiere':  { color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  'Disponibile':  { color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  'In ferie':     { color: '#d97706', bg: 'rgba(217,119,6,0.12)' }
}

const EMPTY_FORM = { name: '', specialization: SPECIALIZZAZIONI[0], leader_id: OPERAI[0].id, member_ids: [], site: '— Nessuno —', status: 'Disponibile', vehicle_id: '' }

export default function SquadreModule() {
  const [squads, setSquads] = useSharedState('todos-ops-squads', INITIAL_SQUADS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  // Drag & drop: { empId, fromSquadId } | null
  const [dragEmp, setDragEmp] = useState(null)
  const [dropTarget, setDropTarget] = useState(null) // squadId | 'roster' | null

  const opName = (id) => OPERAI.find(o => o.id === id)?.name || id
  const vehicleOf = (id) => WP_VEHICLES.find(v => v.id === id)
  // Squadra di appartenenza (come caposquadra o componente)
  const squadOf = (empId) => squads.find(s => s.leader_id === empId || (s.member_ids || []).includes(empId))

  const stats = useMemo(() => ([
    { label: 'Squadre totali',   value: squads.length,                                            icon: Users2,      color: '#2563eb' },
    { label: 'In cantiere',      value: squads.filter(s => s.status === 'In cantiere').length,    icon: HardHat,     color: '#16a34a' },
    { label: 'Disponibili',      value: squads.filter(s => s.status === 'Disponibile').length,    icon: CheckCircle2,color: '#7c3aed' },
    { label: 'Non assegnati',    value: OPERAI.filter(o => !squadOf(o.id)).length,                icon: UserCircle2, color: '#d97706' }
  ]), [squads])

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (squad) => { setEditingId(squad.id); setForm({ vehicle_id: '', ...squad }); setModalOpen(true) }

  const handleSave = () => {
    if (!form.name.trim()) return
    // Mezzo già assegnato a un'altra squadra → conferma
    if (form.vehicle_id) {
      const other = squads.find(s => s.vehicle_id === form.vehicle_id && s.id !== editingId)
      if (other && !window.confirm(`Il mezzo ${vehicleOf(form.vehicle_id)?.plate} è già assegnato a ${other.name}. Spostarlo su questa squadra?`)) return
    }
    setSquads(prev => {
      // se il mezzo è confermato su questa squadra, toglilo dall'altra
      let next = form.vehicle_id
        ? prev.map(s => (s.vehicle_id === form.vehicle_id && s.id !== editingId ? { ...s, vehicle_id: null } : s))
        : prev
      if (editingId) return next.map(s => (s.id === editingId ? { ...form, id: editingId } : s))
      return [{ ...form, id: 'sq-' + Date.now() }, ...next]
    })
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    if (!window.confirm('Eliminare questa squadra?')) return
    setSquads(squads.filter(s => s.id !== id))
  }

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter(m => m !== id) : [...f.member_ids, id]
    }))
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────
  // Sposta un dipendente: toSquadId = null → torna "non assegnato"
  const moveEmployee = (empId, toSquadId) => {
    const leaderSquad = squads.find(s => s.leader_id === empId)
    if (leaderSquad && leaderSquad.id !== toSquadId) {
      alert(`${opName(empId)} è caposquadra di ${leaderSquad.name}.\nPromuovi prima un altro caposquadra (⭐ su un componente) per poterlo spostare.`)
      return
    }
    setSquads(prev => prev.map(s => {
      const cleaned = (s.member_ids || []).filter(m => m !== empId)
      if (s.id === toSquadId && s.leader_id !== empId) return { ...s, member_ids: [...cleaned, empId] }
      return { ...s, member_ids: cleaned }
    }))
  }

  // Il vecchio caposquadra resta in squadra come componente
  const promoteToLeader = (squadId, empId) => {
    setSquads(prev => prev.map(s => {
      if (s.id !== squadId) return s
      return { ...s, leader_id: empId, member_ids: [s.leader_id, ...(s.member_ids || []).filter(m => m !== empId)] }
    }))
  }

  const onDragStartEmp = (e, empId, fromSquadId) => {
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    setDragEmp({ empId, fromSquadId: fromSquadId || null })
  }
  const onDropSquad = (e, squadId) => {
    e.preventDefault()
    if (dragEmp && dragEmp.fromSquadId !== squadId) moveEmployee(dragEmp.empId, squadId)
    setDragEmp(null); setDropTarget(null)
  }
  const onDropRoster = (e) => {
    e.preventDefault()
    if (dragEmp?.fromSquadId) moveEmployee(dragEmp.empId, null)
    setDragEmp(null); setDropTarget(null)
  }

  const chipStyle = (assigned, isDragging) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '5px 10px', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 600,
    cursor: 'grab', userSelect: 'none', opacity: isDragging ? 0.35 : 1,
    border: '1px solid ' + (assigned ? 'var(--border-color)' : '#86efac'),
    background: assigned ? 'var(--bg-card)' : 'rgba(22,163,74,0.08)',
    color: assigned ? 'var(--text-secondary)' : '#15803d'
  })

  return (
    <ModulePage>
      <ModuleHeader
        icon={Users2}
        title="Squadre operative"
        subtitle="Componi le squadre col pulsante o trascinando i dipendenti. ⭐ promuove a caposquadra."
        actions={
          <>
            <ExportButton
              filename="squadre_operative"
              rows={squads.map(s => ({
                'Squadra': s.name, 'Specializzazione': s.specialization,
                'Caposquadra': opName(s.leader_id),
                'Componenti': (s.member_ids || []).map(opName).join(', '),
                'N. componenti': 1 + (s.member_ids || []).length,
                'Mezzo': s.vehicle_id ? `${vehicleOf(s.vehicle_id)?.plate} — ${vehicleOf(s.vehicle_id)?.model}` : '',
                'Cantiere': s.site, 'Stato': s.status
              }))}
            />
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={15} /> Nuova squadra
            </button>
          </>
        }
      />

      <StatGrid stats={stats} />

      {/* ===== ROSTER: tutti i dipendenti (drop qui = rimuovi dalla squadra) ===== */}
      <Card
        style={{
          padding: '12px 14px', marginBottom: '16px',
          outline: dropTarget === 'roster' && dragEmp?.fromSquadId ? '2px dashed var(--primary)' : 'none'
        }}
        onDragOver={(e) => { e.preventDefault(); setDropTarget('roster') }}
        onDragLeave={() => setDropTarget(t => (t === 'roster' ? null : t))}
        onDrop={onDropRoster}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <GripVertical size={13} /> Tutti i dipendenti — trascinali su una squadra (qui per rimuoverli)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {OPERAI.map(o => {
            const sq = squadOf(o.id)
            const isLeader = sq?.leader_id === o.id
            const isDragging = dragEmp?.empId === o.id
            return (
              <span
                key={o.id}
                draggable
                onDragStart={(e) => onDragStartEmp(e, o.id, sq?.id)}
                onDragEnd={() => { setDragEmp(null); setDropTarget(null) }}
                title={o.skills.join(', ') + (sq ? `\nIn ${sq.name}` : '\nNon assegnato')}
                style={chipStyle(!!sq, isDragging)}
              >
                {isLeader && <Star size={11} fill="#d97706" color="#d97706" />}
                {o.name}
                {sq
                  ? <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>· {sq.name.replace('Squadra ', '')}</span>
                  : <span style={{ fontSize: '0.62rem', fontWeight: 800 }}>· libero</span>}
              </span>
            )
          })}
        </div>
      </Card>

      {squads.length === 0 ? (
        <Card><EmptyState icon={Users2} title="Nessuna squadra" text="Crea la prima squadra per iniziare." /></Card>
      ) : (
        <div className="card-grid">
          {squads.map(squad => {
            const st = STATUS_CFG[squad.status] || STATUS_CFG['Disponibile']
            const veh = vehicleOf(squad.vehicle_id)
            const isDrop = dropTarget === squad.id && dragEmp && dragEmp.fromSquadId !== squad.id
            return (
              <Card
                key={squad.id}
                style={{
                  padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
                  outline: isDrop ? '2px dashed var(--primary)' : 'none',
                  background: isDrop ? 'var(--primary-light)' : 'var(--bg-card)'
                }}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(squad.id) }}
                onDragLeave={() => setDropTarget(t => (t === squad.id ? null : t))}
                onDrop={(e) => onDropSquad(e, squad.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{squad.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 2 }}>
                      <Award size={12} /> {squad.specialization}
                    </div>
                  </div>
                  <Pill color={st.color} bg={st.bg}>{squad.status}</Pill>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                    <HardHat size={13} style={{ color: 'var(--primary)' }} />
                    <strong>{opName(squad.leader_id)}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>caposquadra</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                    <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                    {squad.site === '— Nessuno —' ? <em style={{ color: 'var(--text-muted)' }}>Nessun cantiere</em> : squad.site}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={13} style={{ color: 'var(--text-muted)' }} />
                    {veh
                      ? <span><strong>{veh.plate}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{veh.model}</span></span>
                      : <em style={{ color: 'var(--text-muted)' }}>Nessun mezzo</em>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Componenti ({(squad.member_ids || []).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {(squad.member_ids || []).length === 0
                      ? <em style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Solo caposquadra — trascina qui i dipendenti</em>
                      : squad.member_ids.map(id => (
                        <span
                          key={id}
                          draggable
                          onDragStart={(e) => onDragStartEmp(e, id, squad.id)}
                          onDragEnd={() => { setDragEmp(null); setDropTarget(null) }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 6px 3px 9px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600,
                            background: 'var(--primary-light)', color: 'var(--text-secondary)',
                            cursor: 'grab', userSelect: 'none', opacity: dragEmp?.empId === id ? 0.35 : 1
                          }}
                        >
                          {opName(id)}
                          <button
                            type="button" title="Promuovi a caposquadra"
                            onClick={() => promoteToLeader(squad.id, id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: '#d97706' }}
                          ><Star size={11} /></button>
                          <button
                            type="button" title="Rimuovi dalla squadra"
                            onClick={() => moveEmployee(id, null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: '#ef4444' }}
                          ><X size={11} /></button>
                        </span>
                      ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => openEdit(squad)}>
                    <Pencil size={12} /> Modifica
                  </button>
                  <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleDelete(squad.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifica squadra' : 'Nuova squadra'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={handleSave}>Salva</button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Nome squadra">
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Es. Squadra Delta" />
          </Field>
          <Field label="Specializzazione">
            <select style={selectStyle} value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}>
              {SPECIALIZZAZIONI.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Caposquadra">
            <select style={selectStyle} value={form.leader_id} onChange={e => setForm({ ...form, leader_id: e.target.value, member_ids: form.member_ids.filter(m => m !== e.target.value) })}>
              {[...OPERAI].sort((a, b) => (b.role === 'Caposquadra') - (a.role === 'Caposquadra')).map(o => (
                <option key={o.id} value={o.id}>{o.name}{o.role === 'Caposquadra' ? ' ⭐' : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Automezzo">
            <select style={selectStyle} value={form.vehicle_id || ''} onChange={e => setForm({ ...form, vehicle_id: e.target.value || null })}>
              <option value="">— Nessuno —</option>
              {WP_VEHICLES.map(v => {
                const usedBy = squads.find(s => s.vehicle_id === v.id && s.id !== editingId)
                return <option key={v.id} value={v.id}>{v.plate} — {v.model}{usedBy ? ` (in uso: ${usedBy.name})` : ''}</option>
              })}
            </select>
          </Field>
          <Field label="Cantiere assegnato">
            <select style={selectStyle} value={form.site} onChange={e => setForm({ ...form, site: e.target.value })}>
              {CANTIERI.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Stato">
            <select style={selectStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Componenti" span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {OPERAI.filter(o => o.id !== form.leader_id).map(o => {
                const selected = form.member_ids.includes(o.id)
                const sq = squadOf(o.id)
                const elsewhere = sq && sq.id !== editingId
                return (
                  <button key={o.id} type="button" onClick={() => toggleMember(o.id)} title={elsewhere ? `Attualmente in ${sq.name}` : ''} style={{
                    padding: '5px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600,
                    border: '1px solid ' + (selected ? 'var(--primary)' : 'var(--border-color)'),
                    background: selected ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: selected ? 'var(--primary)' : 'var(--text-secondary)'
                  }}>
                    {o.name}{elsewhere && !selected ? ' ·' + sq.name.replace('Squadra', '') : ''}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Modal>
    </ModulePage>
  )
}
