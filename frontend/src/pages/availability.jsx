import { useState } from 'react'
export default function Availability() {
  const [productId, setProductId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const check = async () => {
    if (!productId || !from || !to) return setError('Fill all fields')
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`http://localhost:8000/rentals/products/${productId}/availability?from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error')
      setResult(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h2>Check Availability</h2>
      <input placeholder="Product ID" value={productId} onChange={e => setProductId(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <button onClick={check} style={{ width: '100%', padding: 10 }}>{loading ? 'Checking...' : 'Check'}</button>
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 'bold', color: result.available ? 'green' : 'red' }}>
            {result.available ? '✅ Available!' : '❌ Not Available'}
          </p>
          {result.busyPeriods?.length > 0 && <><h4>Busy Periods:</h4>{result.busyPeriods.map((p, i) => <p key={i} style={{ color: 'red' }}>🔴 {p.start} → {p.end}</p>)}</>}
          {result.freeWindows?.length > 0 && <><h4>Free Windows:</h4>{result.freeWindows.map((p, i) => <p key={i} style={{ color: 'green' }}>🟢 {p.start} → {p.end}</p>)}</>}
        </div>
      )}
    </div>
  )
}