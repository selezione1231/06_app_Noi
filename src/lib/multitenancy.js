// ============================================================================
// TODOS GROUP — Multi-tenancy
// ----------------------------------------------------------------------------
// Gestisce il concetto di "azienda attiva" all'interno del gruppo Todos.
// In produzione questo sarà guidato da Supabase (tabella companies + RLS).
// In demo, le aziende sono hard-coded e la selezione è in localStorage.
// ============================================================================

const LS_ACTIVE_COMPANY = 'todos-hub-active-company'

// --- Elenco aziende del gruppo --------------------------------------------
export const COMPANIES = [
  {
    id: 'todos-srl',
    code: 'TODOS',
    name: 'Todos S.r.l.',
    shortName: 'Todos',
    sector: 'Tecnologia & Software',
    color: '#A82238',
    employees: 42,
    hq: 'Milano',
    piva: '01234567890',
    logo: null
  },
  {
    id: 'netimpl-spa',
    code: 'NETIMPL',
    name: 'NetImpl S.p.A.',
    shortName: 'NetImpl',
    sector: 'Telecomunicazioni & Reti',
    color: '#1d4ed8',
    employees: 87,
    hq: 'Bergamo',
    piva: '09876543210',
    logo: null
  },
  {
    id: 'servizi-generali-srl',
    code: 'SG',
    name: 'Servizi Generali S.r.l.',
    shortName: 'ServiziGen',
    sector: 'Facility Management',
    color: '#059669',
    employees: 31,
    hq: 'Brescia',
    piva: '11223344556',
    logo: null
  },
  {
    id: 'todos-holding',
    code: 'HOLD',
    name: 'Todos Holding S.p.A.',
    shortName: 'Holding',
    sector: 'Capogruppo',
    color: '#7c3aed',
    employees: 8,
    hq: 'Milano',
    piva: '55443322110',
    logo: null
  },
  {
    id: 'todos-academy',
    code: 'ACAD',
    name: 'Todos Academy S.r.l.',
    shortName: 'Academy',
    sector: 'Formazione & Consulenza',
    color: '#d97706',
    employees: 15,
    hq: 'Verona',
    piva: '99887766554',
    logo: null
  }
]

// Azienda "tutte" per admin gruppo
export const ALL_COMPANIES_SENTINEL = {
  id: '__all__',
  code: 'GRP',
  name: 'Todos Group',
  shortName: 'Tutti',
  sector: 'Vista Consolidata',
  color: '#475569',
  employees: COMPANIES.reduce((s, c) => s + c.employees, 0),
  hq: 'Milano',
  piva: null,
  logo: null
}

// --- Helpers ---------------------------------------------------------------

export function getActiveCompanyId() {
  try {
    return localStorage.getItem(LS_ACTIVE_COMPANY) || COMPANIES[0].id
  } catch {
    return COMPANIES[0].id
  }
}

export function setActiveCompanyId(id) {
  try {
    localStorage.setItem(LS_ACTIVE_COMPANY, id)
  } catch { /* no-op */ }
}

export function getActiveCompany() {
  const id = getActiveCompanyId()
  if (id === ALL_COMPANIES_SENTINEL.id) return ALL_COMPANIES_SENTINEL
  return COMPANIES.find(c => c.id === id) || COMPANIES[0]
}

// Restituisce true se l'utente può vedere tutte le aziende (admin gruppo)
export function canSeeAllCompanies(userRoles = []) {
  return userRoles.includes('admin') || userRoles.includes('direzione')
}
