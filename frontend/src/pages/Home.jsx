import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  const pages = [
    { path: '/login', label: '🔐 Login', desc: 'Sign in to your account' },
    { path: '/register', label: '📝 Register', desc: 'Create a new account' },
    { path: '/products', label: '📦 Products', desc: 'Browse all rental products' },
    { path: '/availability', label: '📅 Availability', desc: 'Check product availability' },
    { path: '/chat', label: '🤖 AI Chat', desc: 'Chat with RentPi assistant' },
    { path: '/trending', label: '🔥 Trending', desc: 'See trending products today' },
    { path: '/profile', label: '👤 Profile', desc: 'View user discount tier' },
    { path: '/surge', label: '📈 Surge', desc: 'View surge calendar' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      {/* Header */}
      <div style={{ background: '#7c3aed', color: '#fff', padding: '24px 40px' }}>
        <h1 style={{ margin: 0 }}>🏠 RentPi</h1>
        <p style={{ margin: '4px 0 0', opacity: 0.8 }}>Your modern rental platform</p>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
        <h2 style={{ marginBottom: 24 }}>Navigate to</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {pages.map(p => (
            <div key={p.path} onClick={() => navigate(p.path)}
              style={{ padding: 24, background: '#fff', borderRadius: 12, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.1s',
                border: '2px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.border = '2px solid #7c3aed'}
              onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{p.label.split(' ')[0]}</div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{p.label.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}