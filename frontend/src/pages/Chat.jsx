import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

export default function Chat() {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(uuidv4())
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadSessions = async () => {
    try {
      const res = await fetch('http://localhost:8000/chat/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {}
  }

  const loadHistory = async (sid) => {
    setSessionId(sid)
    try {
      const res = await fetch(`http://localhost:8000/chat/${sid}/history`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {}
  }

  const newChat = () => {
    setSessionId(uuidv4())
    setMessages([])
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: input })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      loadSessions()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: '#1e1e2e', color: '#fff', padding: 16, overflowY: 'auto' }}>
        <button onClick={newChat} style={{ width: '100%', padding: 10, marginBottom: 16, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          + New Chat
        </button>
        {sessions.map(s => (
          <div key={s.sessionId} onClick={() => loadHistory(s.sessionId)}
            style={{ padding: 10, marginBottom: 8, background: s.sessionId === sessionId ? '#7c3aed' : '#2e2e3e', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <div style={{ fontWeight: 'bold' }}>{s.name || 'Unnamed'}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{new Date(s.lastMessageAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {messages.length === 0 && <p style={{ textAlign: 'center', color: '#aaa', marginTop: 80 }}>Ask anything about RentPi...</p>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{ maxWidth: '70%', padding: '10px 16px', borderRadius: 16, background: m.role === 'user' ? '#7c3aed' : '#fff', color: m.role === 'user' ? '#fff' : '#000', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{ padding: '10px 16px', borderRadius: 16, background: '#fff', color: '#888' }}>typing...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: 16, background: '#fff', display: 'flex', gap: 8, borderTop: '1px solid #eee' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about rentals, products, availability..."
            disabled={loading}
            style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
          <button onClick={send} disabled={loading}
            style={{ padding: '12px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}