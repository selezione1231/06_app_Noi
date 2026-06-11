// ============================================================================
// TODOS HUB — Stato condiviso dei moduli (Supabase + cache localStorage)
// ----------------------------------------------------------------------------
// useSharedState(key, initial) è il sostituto drop-in di useLocalState:
//   - Supabase ("06app_Noi_app_state") è la fonte di verità condivisa
//   - localStorage resta come cache locale (avvio istantaneo + offline)
//   - realtime: se un altro utente salva, lo stato si aggiorna da solo
//   - in modalità demo (o senza Supabase) si comporta come useLocalState
//
// Modello dati: una riga per dataset → { key, data jsonb, updated_at, updated_by }.
// Scritture debounced (600ms) con last-writer-wins per dataset.
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'

const TABLE = '06app_Noi_app_state'

// Modalità condivisa solo con Supabase configurato e login reale (non demo).
function isSharedMode() {
  if (!isSupabaseConfigured) return false
  try { return !localStorage.getItem('demo-user') } catch { return true }
}

function readCache(key, initial) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : initial
  } catch { return initial }
}

function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* no-op */ }
}

async function currentUserEmail() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.email || null
  } catch { return null }
}

export function useSharedState(key, initial) {
  const [state, setState] = useState(() => readCache(key, initial))
  const shared = useRef(isSharedMode())
  // Gate: non scrivere sul DB finché il load iniziale non è completato,
  // per non sovrascrivere i dati condivisi con una cache locale stantia.
  const loaded = useRef(false)
  // JSON dell'ultimo valore allineato col DB: evita upsert-eco dopo load/realtime.
  const lastSyncedJson = useRef(null)
  const saveTimer = useRef(null)
  const stateJson = JSON.stringify(state)

  // 1) Load iniziale dal DB (seed della riga se assente) + sottoscrizione realtime
  useEffect(() => {
    if (!shared.current) return
    let cancelled = false

    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('data')
        .eq('key', key)
        .maybeSingle()
      if (cancelled) return
      if (!error && data) {
        lastSyncedJson.current = JSON.stringify(data.data)
        loaded.current = true
        setState(data.data)
        writeCache(key, data.data)
      } else if (!error && !data) {
        // Prima volta in assoluto per questo dataset: seed col valore locale/demo.
        const seed = readCache(key, initial)
        lastSyncedJson.current = JSON.stringify(seed)
        loaded.current = true
        await supabase.from(TABLE).upsert(
          { key, data: seed, updated_at: new Date().toISOString(), updated_by: await currentUserEmail() },
          { onConflict: 'key' }
        )
      }
    }
    load()

    const channel = supabase
      .channel(`app-state-${key}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `key=eq.${key}` },
        (payload) => {
          const remote = payload.new?.data
          if (remote === undefined) return
          const remoteJson = JSON.stringify(remote)
          if (remoteJson === lastSyncedJson.current) return
          lastSyncedJson.current = remoteJson
          setState(remote)
          writeCache(key, remote)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [key])

  // 2) Persistenza a ogni modifica: cache locale sempre, DB se in modalità condivisa
  useEffect(() => {
    writeCache(key, state)
    if (!shared.current || !loaded.current) return
    if (stateJson === lastSyncedJson.current) return

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      lastSyncedJson.current = stateJson
      const { error } = await supabase.from(TABLE).upsert(
        { key, data: JSON.parse(stateJson), updated_at: new Date().toISOString(), updated_by: await currentUserEmail() },
        { onConflict: 'key' }
      )
      if (error) {
        // Salvataggio fallito (es. offline): segna come non sincronizzato
        // così la prossima modifica locale ritenta l'upsert.
        lastSyncedJson.current = '__unsynced__'
        console.warn(`Sync Supabase fallita per "${key}":`, error.message)
      }
    }, 600)

    return () => clearTimeout(saveTimer.current)
  }, [key, stateJson])

  return [state, setState]
}
