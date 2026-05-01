import { useState, useEffect } from 'react'
export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('http://localhost:8000/rentals/products')
      .then(r => r.json())
      .then(data => { setProducts(data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  return (
    <div style={{ padding: 24 }}>
      <h2>Products</h2>
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {products?.map(p => (
            <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
              <h4>{p.name}</h4>
              <p>{p.category}</p>
              <p>${p.pricePerDay}/day</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}