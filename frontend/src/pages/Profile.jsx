import { useState } from 'react'

export default function Profile() {
  const [userId, setUserId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!userId) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch(`http://localhost:8000/users/${userId}/discount`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'User not found')
      setData(json)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 24 }}>
      <h2>User Profile & Discount</h2>
      <input placeholder="Enter User ID" value={userId} onChange={e => setUserId(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 12 }} />
      <button onClick={load} style={{ width: '100%', padding: 10, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8 }}>
        {loading ? 'Loading...' : 'Lookup'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {data && (
        <div style={{ marginTop: 24, padding: 20, background: '#f5f3ff', borderRadius: 12 }}>
          <p><b>User ID:</b> {data.userId}</p>
          <p><b>Security Score:</b> {data.securityScore}</p>
          <p><b>Discount:</b> <span style={{ color: '#7c3aed', fontWeight: 'bold', fontSize: 20 }}>{data.discountPercent}%</span></p>
        </div>
      )}
    </div>
  )
}