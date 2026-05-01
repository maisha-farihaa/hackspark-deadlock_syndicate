import { useState, useEffect } from 'react'

export default function Trending() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const fetch_ = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`http://localhost:8000/analytics/recommendations?date=${today}&limit=6`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error')
      setItems(data.recommendations || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { fetch_() }, [])

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>🔥 Trending Today</h2>
        <button onClick={fetch_} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Refresh</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {loading ? Array(6).fill(0).map((_, i) => (
          <div key={i} style={{ height: 120, background: '#e0e0e0', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        )) : items.map(item => (
          <div key={item.productId} style={{ padding: 20, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{item.category}</span>
            <h4 style={{ margin: '12px 0 4px' }}>{item.name}</h4>
            <p style={{ color: '#888', fontSize: 13 }}>Score: {item.score}</p>
          </div>
        ))}
      </div>
    </div>
  )
}