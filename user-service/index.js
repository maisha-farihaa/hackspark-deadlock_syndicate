const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')

const app = express()
app.use(express.json())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const JWT_SECRET = process.env.JWT_SECRET || 'secret123'
const CENTRAL_API_URL = process.env.CENTRAL_API_URL
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN

// Create users table
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(console.error)

// P1 - Health check
app.get('/status', (req, res) => {
  res.json({ service: 'user-service', status: 'OK' })
})

// P2 - Register
app.post('/users/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' })
  try {
    const hashed = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashed]
    )
    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.status(201).json({ token, user })
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: err.message })
  }
})

// P2 - Login
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' })
    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// P2 - Get my profile
app.get('/users/me', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET)
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [decoded.id]
    )
    res.json(result.rows[0])
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// P6 - Loyalty discount
app.get('/users/:id/discount', async (req, res) => {
  try {
    const response = await fetch(
      `${CENTRAL_API_URL}/api/data/users/${req.params.id}`,
      { headers: { Authorization: `Bearer ${CENTRAL_API_TOKEN}` } }
    )
    if (response.status === 404)
      return res.status(404).json({ error: 'User not found' })
    const data = await response.json()
    const score = data.securityScore
    let discount = 0
    if (score >= 80) discount = 20
    else if (score >= 60) discount = 15
    else if (score >= 40) discount = 10
    else if (score >= 20) discount = 5
    res.json({
      userId: data.id,
      securityScore: score,
      discountPercent: discount
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(8001, () => console.log('user-service running on port 8001'))