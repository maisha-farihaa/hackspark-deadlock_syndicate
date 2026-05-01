const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL;
const RENTAL_SERVICE_URL = process.env.RENTAL_SERVICE_URL;

// ── AI call (Gemini) ──────────────────────────────────────────────────────────
async function callAI(messages, systemPrompt) {
  if (!GEMINI_API_KEY) throw new Error('No AI API key configured');

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    }
  );

  return response.data.candidates[0].content.parts[0].text;
}

// ── MongoDB ───────────────────────────────────────────────────────────────────
let db;

async function connectDB() {
  const client = await MongoClient.connect(MONGO_URI);
  db = client.db();
  // Indexes for performance
  await db.collection('messages').createIndex({ sessionId: 1, timestamp: 1 });
  await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
  console.log('MongoDB connected');
}

function getDB() {
  if (!db) throw new Error('Database not ready');
  return db;
}

// ── Topic guard ───────────────────────────────────────────────────────────────
const RENTPI_KEYWORDS = [
  'rental', 'product', 'category', 'price', 'discount',
  'available', 'availability', 'renter', 'owner', 'rentpi',
  'booking', 'gear', 'surge', 'peak', 'trending', 'rent',
  'item', 'lease', 'hire', 'equipment', 'cost', 'rate'
];

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Fetch context from other services ────────────────────────────────────────
async function fetchContext() {
  const parts = [];
  try {
    const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals/stats`, {
      headers: { Authorization: `Bearer ${CENTRAL_API_TOKEN}` },
      params: { group_by: 'category' },
      timeout: 3000
    });
    parts.push(`Top rental categories: ${JSON.stringify(data.data?.slice(0, 5))}`);
  } catch {}

  try {
    const { data } = await axios.get(`${RENTAL_SERVICE_URL}/rentals/products`, {
      params: { limit: 5 },
      timeout: 3000
    });
    parts.push(`Sample products: ${JSON.stringify(data.data?.slice(0, 3))}`);
  } catch {}

  return parts.join('\n');
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => {
  res.json({ service: 'agentic-service', status: 'OK' });
});

// POST /chat  — send a message
app.post('/chat', async (req, res) => {
  const { sessionId = uuidv4(), message } = req.body;

  if (!message || typeof message !== 'string')
    return res.status(400).json({ error: 'message is required' });

  // Off-topic guard
  if (!isOnTopic(message)) {
    return res.json({
      sessionId,
      reply: "I can only help with RentPi-related questions — rentals, products, availability, pricing, categories, and discounts."
    });
  }

  try {
    const database = getDB();
    const sessions = database.collection('sessions');
    const messagesCol = database.collection('messages');

    // Load conversation history
    const existing = await sessions.findOne({ sessionId });
    let history = [];
    if (existing) {
      const msgs = await messagesCol
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .limit(20)  // keep last 20 turns to stay within context
        .toArray();
      history = msgs.map(m => ({ role: m.role, content: m.content }));
    }

    // Build system prompt with live context
    const context = await fetchContext();
    const systemPrompt = `You are RentPi Assistant, an AI helper for the RentPi rental platform.
Only answer questions about RentPi: rentals, products, availability, pricing, categories, and discounts.
If a question is unrelated, politely decline and redirect to RentPi topics.
Never fabricate data. If you lack specific data, say so honestly.

Live platform context:
${context || 'No live data available right now.'}`;

    // Call AI
    const reply = await callAI(
      [...history, { role: 'user', content: message }],
      systemPrompt
    );

    const now = new Date();

    // Create session if new
    if (!existing) {
      // Auto-generate a short session name
      let name = message.slice(0, 40).trim();
      try {
        name = await callAI(
          [{ role: 'user', content: `Give a 3-5 word title for this conversation: "${message}". Reply with ONLY the title, nothing else.` }],
          'You are a title generator. Output only the title with no punctuation or quotes.'
        );
        name = name.trim().slice(0, 60);
      } catch {}

      await sessions.insertOne({ sessionId, name, createdAt: now, lastMessageAt: now });
    } else {
      await sessions.updateOne({ sessionId }, { $set: { lastMessageAt: now } });
    }

    // Persist messages
    await messagesCol.insertMany([
      { sessionId, role: 'user',      content: message, timestamp: now },
      { sessionId, role: 'assistant', content: reply,   timestamp: new Date() }
    ]);

    res.json({ sessionId, reply });

  } catch (e) {
    console.error('/chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /chat/sessions  — list all sessions
app.get('/chat/sessions', async (req, res) => {
  try {
    const sessions = await getDB()
      .collection('sessions')
      .find()
      .sort({ lastMessageAt: -1 })
      .toArray();
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /chat/:sessionId/history  — full message history
app.get('/chat/:sessionId/history', async (req, res) => {
  try {
    const database = getDB();
    const session = await database.collection('sessions').findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const msgs = await database.collection('messages')
      .find({ sessionId: req.params.sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    res.json({
      sessionId: req.params.sessionId,
      name: session.name,
      createdAt: session.createdAt,
      messages: msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /chat/:sessionId  — delete a session and its messages
app.delete('/chat/:sessionId', async (req, res) => {
  try {
    const database = getDB();
    const session = await database.collection('sessions').findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await database.collection('sessions').deleteOne({ sessionId: req.params.sessionId });
    await database.collection('messages').deleteMany({ sessionId: req.params.sessionId });
    res.json({ deleted: true, sessionId: req.params.sessionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(8004, () => console.log('agentic-service running on port 8004'));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });