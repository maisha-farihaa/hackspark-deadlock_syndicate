import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const links = [
    { path: '/', label: '🏠 Home' },
    { path: '/products', label: '📦 Products' },
    { path: '/availability', label: '📅 Availability' },
    { path: '/chat', label: '🤖 Chat' },
    { path: '/trending', label: '🔥 Trending' },
    { path: '/profile', label: '👤 Profile' },
    { path: '/surge', label: '📈 Surge' },
  ]

  return (
    <div style={{ background: '#7c3aed', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4 }}>
      {links.map(l => (
        <button key={l.path} onClick={() => navigate(l.path)}
          style={{ padding: '14px 16px', background: 'none', border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: location.pathname === l.path ? 'bold' : 'normal',
            borderBottom: location.pathname === l.path ? '3px solid #fff' : '3px solid transparent' }}>
          {l.label}
        </button>
      ))}
    </div>
  )
}