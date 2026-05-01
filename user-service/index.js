const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// In-memory storage (temporary)
const users = [];

const JWT_SECRET = "secret123"; // temporary
const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

// Health check
app.get('/status', (req, res) => {
  res.json({ service: 'user-service', status: 'OK' });
});

// Register
app.post('/users/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = users.find(u => u.email === email);
    if (exists) return res.status(409).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const user = {
      id: users.length + 1,
      name,
      email,
      password: hashed
    };

    users.push(user);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    res.json({ token, user: { id: user.id, name, email } });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

    res.json({ token });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current user
app.get('/users/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);

    res.json({ id: user.id, name: user.name, email: user.email });

  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Discount (Central API)
app.get('/users/:id/discount', async (req, res) => {
  try {
    const { data } = await axios.get(
      `${CENTRAL_API_URL}/api/data/users/${req.params.id}`,
      {
        headers: { Authorization: `Bearer ${CENTRAL_API_TOKEN}` }
      }
    );

    const score = data.securityScore;
    let discount = 0;

    if (score >= 80) discount = 20;
    else if (score >= 60) discount = 15;
    else if (score >= 40) discount = 10;
    else if (score >= 20) discount = 5;

    res.json({
      userId: data.id,
      securityScore: score,
      discountPercent: discount
    });

  } catch (e) {
    if (e.response?.status === 404)
      return res.status(404).json({ error: 'User not found' });

    res.status(500).json({ error: e.message });
  }
});

app.listen(8001, () => console.log('user-service running on port 8001'));