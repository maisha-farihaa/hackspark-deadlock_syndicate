import { useState } from 'react'

export default function Surge() {
  const [month, setMonth] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!month) return
    setLoading(true); setError(''); setData([])
    try {
      const res = await fetch(`http://localhost:8000/analytics/surge-days?month=${month}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Error')
      setData(json.data || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <h2>📈 Surge Calendar</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
        <button onClick={load} style={{ padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', marginBottom: 8, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <span><b>{d.date}</b> — {d.count} rentals</span>
          <span style={{ color: d.nextSurgeDate ? '#7c3aed' : '#aaa', fontSize: 13 }}>
            {d.nextSurgeDate ? `Next surge: ${d.nextSurgeDate} (${d.daysUntil}d)` : 'No future surge'}
          </span>
        </div>
      ))}
    </div>
  )
}