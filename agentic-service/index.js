const express = require('express');
const app = express();

app.use(express.json());

// ---------------- STATUS ----------------
app.get('/status', (req, res) => {
  res.json({ service: 'agentic-service', status: 'OK' });
});

// ---------------- CHAT ----------------
app.post('/chat', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // simple demo response
  res.json({
    reply: `🤖 RentPi Assistant: You said "${message}". I can help with rentals, pricing, and availability!`
  });
});

// ---------------- START ----------------
app.listen(8004, () => {
  console.log('agentic-service running on port 8004');
});