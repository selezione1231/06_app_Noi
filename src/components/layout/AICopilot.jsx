import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, X, RotateCcw, Loader2 } from 'lucide-react'

// ============================================================================
// AICopilot — assistente AI in linguaggio naturale basato su Gemini
// Risponde a domande sui dati HR/Operations caricati in app.
// Usa @google/generative-ai già installato.
// ============================================================================

const GEMINI_MODEL = 'gemini-1.5-flash'

function buildSystemPrompt(context) {
  return `Sei un assistente HR operativo per l'azienda Todos Group. Rispondi sempre in italiano, in modo conciso e professionale.

Hai accesso ai seguenti dati aziendali aggiornati (estratto sintetico):

DIPENDENTI (${context.employees.length} totali):
${context.employees.map(e => `- ${e.name} | ${e.role} | ${e.department} | ${e.contract_type} | Assunto: ${e.hire_date}`).join('\n')}

FERIE/ASSENZE (ultimi stati):
${context.leaves.slice(0, 10).map(l => `- ${l.employee_name}: ${l.type} ${l.start_date}→${l.end_date} [${l.status}]`).join('\n')}

NOTE SPESE PENDENTI:
${context.expenses.filter(e => e.status === 'Pending').map(e => `- ${e.employee_name}: €${e.amount} da ${e.merchant} [da approvare]`).join('\n') || 'Nessuna'}

Rispondi alle domande dell'utente basandoti su questi dati. Se la domanda non riguarda i dati disponibili, dì che non hai accesso a quella informazione specifica. Non inventare dati.`
}

const SUGGESTED_QUESTIONS = [
  'Chi è in ferie questa settimana?',
  'Quante richieste di ferie sono in attesa di approvazione?',
  'Quali note spese devo ancora approvare?',
  'Chi ha la visita medica in scadenza entro 30 giorni?',
  'Dimmi un riassunto dei dipendenti del dipartimento Tech',
  'Chi è in periodo di prova?'
]

export default function AICopilot({ employees = [], leaves = [], expenses = [] }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo assistente AI per Todos Hub. Posso rispondere a domande sui tuoi dipendenti, ferie, spese e molto altro. Cosa vuoi sapere?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('todos-gemini-key') || import.meta.env?.VITE_GEMINI_API_KEY || '' } catch { return '' }
  })
  const [showKeyInput, setShowKeyInput] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callGemini = async (userMessage) => {
    if (!apiKey) {
      return 'Per usare il Copilot AI è necessario configurare una API Key Gemini. Clicca su "Configura API Key" qui sopra.'
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

      const systemPrompt = buildSystemPrompt({ employees, leaves, expenses })
      const fullPrompt = `${systemPrompt}\n\nDomanda dell'utente: ${userMessage}`

      const result = await model.generateContent(fullPrompt)
      return result.response.text()
    } catch (err) {
      if (err.message?.includes('API_KEY')) {
        return 'Chiave API non valida. Verifica la configurazione.'
      }
      if (err.message?.includes('quota')) {
        return 'Quota API superata. Riprova più tardi.'
      }
      return `Errore durante la chiamata AI: ${err.message}`
    }
  }

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const response = await callGemini(msg)
    setMessages(prev => [...prev, { role: 'assistant', content: response }])
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleReset = () => {
    setMessages([{ role: 'assistant', content: 'Conversazione resettata. Come posso aiutarti?' }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #A82238, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={20} style={{ color: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', margin: 0 }}>AI Copilot</h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', margin: '2px 0 0' }}>
            Powered by Google Gemini · Chiedi in linguaggio naturale sui tuoi dati HR
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setShowKeyInput(v => !v)}
            title="Configura API Key"
            style={{ padding: '6px 10px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '7px', background: apiKey ? '#f0fdf4' : '#fef2f2', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: apiKey ? '#16a34a' : '#ef4444' }}
          >
            {apiKey ? '✓ API Key' : '⚠ API Key mancante'}
          </button>
          <button onClick={handleReset} title="Reset chat" style={{ padding: '6px 8px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '7px', background: 'white', cursor: 'pointer', color: '#64748b' }}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* API Key config */}
      {showKeyInput && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
            Inserisci la tua Google Gemini API Key (salvata solo localmente):
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #fde68a', borderRadius: '7px', fontSize: '0.82rem' }}
            />
            <button
              onClick={() => {
                localStorage.setItem('todos-gemini-key', apiKey)
                setShowKeyInput(false)
              }}
              style={{ padding: '7px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Salva
            </button>
          </div>
        </div>
      )}

      {/* Domande suggerite */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Suggerimenti
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '20px', background: 'white', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary, #475569)', whiteSpace: 'nowrap', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '8px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #A82238, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} style={{ color: 'white' }} />
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--primary, #A82238)' : 'white',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary, #1e293b)',
              fontSize: '0.85rem', lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid var(--border-color, #e2e8f0)' : 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #A82238, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} style={{ color: 'white' }} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'white', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-muted, #64748b)' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sto elaborando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Chiedi qualcosa sui tuoi dati HR... (Invio per inviare)"
          style={{ flex: 1, padding: '11px 16px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{ padding: '11px 16px', background: 'var(--primary, #A82238)', color: 'white', border: 'none', borderRadius: '12px', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', opacity: input.trim() && !loading ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}
        >
          <Send size={15} /> Invia
        </button>
      </div>
    </div>
  )
}
