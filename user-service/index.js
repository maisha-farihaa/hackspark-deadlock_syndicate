const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express()
app.use(express.json())

// ENV
const JWT_SECRET = "secret123";

// In-memory users
const users = [];
let idCounter = 1;

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
    // Check duplicate email
    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = {
      id: idCounter++,
      name,
      email,
      password: hashed
    };

    users.push(user);

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
})

// P2 - Login
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

// ------------------- AUTH MIDDLEWARE -------------------
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token" });
  }

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

// ------------------- ME -------------------
app.get("/users/me", auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email
  });
});

app.listen(8001, () => {
  console.log("user-service running on port 8001");
});
