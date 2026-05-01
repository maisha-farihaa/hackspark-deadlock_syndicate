import { useState } from 'react'
export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>Register to RentPi</h2>
      <input placeholder="Name" value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <input placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8 }} />
      <button style={{ width: '100%', padding: 10 }}>Register</button>
      <p>Have account? <a href="/login">Login</a></p>
    </div>
  )
}