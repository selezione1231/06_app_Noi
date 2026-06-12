// ============================================================================
// TODOS HUB — Accesso ai dati importati dal gestionale WORK_PRO_TODOS
// ----------------------------------------------------------------------------
// Strato di lettura per le tabelle di atterraggio (contacts, projects, ...).
// I moduli mantengono la loro UI: qui si fa solo query + mappatura.
// In demo mode (o senza Supabase) le funzioni ritornano null e i moduli
// usano i loro dati seed come prima.
// ============================================================================

import { supabase, isSupabaseConfigured } from '../supabaseClient'

export function isLegacyDataAvailable() {
  if (!isSupabaseConfigured) return false
  try { return !localStorage.getItem('demo-user') } catch { return true }
}

/**
 * Anagrafica clienti/fornitori (tabella contacts, ex TB_ANAGRAFE).
 * Ricerca e filtri lato server: l'anagrafica completa ha 12k record.
 * @returns { rows, total } — rows mappate per la UI, total = conteggio filtrato
 */
export async function fetchContacts({ q = '', tipo = 'Tutti', includeUnused = false, limit = 300 } = {}) {
  if (!isLegacyDataAvailable()) return null
  let query = supabase
    .from('contacts')
    .select('legacy_id,name,internal_code,vat_number,fiscal_code,address,zip,city,province,is_customer,is_supplier,is_public_body,unused,email,phone1,mobile1', { count: 'exact' })

  if (!includeUnused) query = query.eq('unused', false)
  if (tipo === 'Clienti') query = query.eq('is_customer', true)
  else if (tipo === 'Fornitori') query = query.eq('is_supplier', true)

  const s = q.trim().replace(/[%,()]/g, ' ')
  if (s) query = query.or(`name.ilike.%${s}%,internal_code.ilike.%${s}%,city.ilike.%${s}%,vat_number.ilike.%${s}%`)

  const { data, error, count } = await query.order('name').limit(limit)
  if (error) {
    console.warn('fetchContacts:', error.message)
    return null
  }
  const rows = (data || []).map(c => ({
    id: c.legacy_id,
    arca_code: c.internal_code || '—',
    name: c.name,
    piva: c.vat_number || c.fiscal_code || '',
    address: [c.address, [c.zip, c.city].filter(Boolean).join(' '), c.province ? `(${c.province})` : null].filter(Boolean).join(', '),
    email: c.email,
    phone: c.mobile1 || c.phone1,
    unused: c.unused,
    type: c.is_customer && c.is_supplier ? 'Cliente+Forn.'
      : c.is_customer ? 'Cliente'
      : c.is_supplier ? 'Fornitore'
      : c.is_public_body ? 'Ente pubblico' : 'Contatto'
  }))
  return { rows, total: count ?? rows.length }
}

// Cache nomi (7 aziende e nomi cliente già risolti)
let _companies = null
const _contactNames = new Map()

async function companyNames() {
  if (_companies) return _companies
  const { data } = await supabase.from('companies').select('legacy_id,name')
  _companies = new Map((data || []).map(c => [c.legacy_id, c.name]))
  return _companies
}

async function contactNames(ids) {
  const missing = [...new Set(ids)].filter(id => id !== null && !_contactNames.has(id))
  if (missing.length > 0) {
    const { data } = await supabase.from('contacts').select('legacy_id,name').in('legacy_id', missing)
    for (const c of (data || [])) _contactNames.set(c.legacy_id, c.name)
  }
  return _contactNames
}

/**
 * Sottocommesse (tabella projects, ex TB_CANTIERI). 6k record, 611 aperte.
 * @returns { rows, total }
 */
export async function fetchProjects({ q = '', soloManutenzione = false, includeClosed = false, limit = 300 } = {}) {
  if (!isLegacyDataAvailable()) return null
  let query = supabase
    .from('projects')
    .select('legacy_id,code,description,project_type,customer_legacy_id,company_legacy_id,hidden,unused,notes', { count: 'exact' })

  if (!includeClosed) query = query.eq('hidden', false).eq('unused', false)
  if (soloManutenzione) query = query.eq('project_type', 'MAN')
  const s = q.trim().replace(/[%,()]/g, ' ')
  if (s) query = query.or(`code.ilike.%${s}%,description.ilike.%${s}%`)

  const { data, error, count } = await query.order('code').limit(limit)
  if (error) {
    console.warn('fetchProjects:', error.message)
    return null
  }
  const [companies, clienti] = await Promise.all([
    companyNames(),
    contactNames((data || []).map(p => p.customer_legacy_id))
  ])
  const rows = (data || []).map(p => ({
    id: p.legacy_id,
    code: p.code || '—',
    name: p.description || '',
    client_name: clienti.get(p.customer_legacy_id) || '—',
    company_name: companies.get(p.company_legacy_id) || '—',
    type: p.project_type || '—',
    is_maintenance: p.project_type === 'MAN',
    hidden: p.hidden,
    unused: p.unused,
    notes: p.notes
  }))
  return { rows, total: count ?? rows.length }
}
