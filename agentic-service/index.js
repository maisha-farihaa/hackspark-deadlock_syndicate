const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MONGO_URI = process.env.MONGO_URI;
const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

const groq = new Groq({ apiKey: GROQ_API_KEY });
let db;

MongoClient.connect(MONGO_URI).then(client => {
  db = client.db();
  console.log('MongoDB connected');
});

const RENTPI_KEYWORDS = [
  'rental', 'product', 'category', 'price', 'discount',
  'available', 'availability', 'renter', 'owner', 'rentpi',
  'booking', 'gear', 'surge', 'peak', 'trending', 'rent'
];

function isOnTopic(message) {
  const lower = message.toLowerCase();
  return RENTPI_KEYWORDS.some(kw => lower.includes(kw));
}

app.get('/status', (req, res) => {
  res.json({ service: 'agentic-service', status: 'OK' });
});

app.post('/chat', async (req, res) => {
  const { sessionId = uuidv4(), message } = req.body;

  if (!isOnTopic(message)) {
    return res.json({
      sessionId,
      reply: "I can only help with RentPi-related questions about rentals, products, categories, availability, and discounts."
    });
  }

  try {
    // Get context from services
    let context = '';
    try {
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals/stats`, {
        headers: { Authorization: `Bearer ${CENTRAL_API_TOKEN}` },
        params: { group_by: 'category' }
      });
      context = `Category stats: ${JSON.stringify(data.data.slice(0, 5))}`;
    } catch {}

    // Load history
    const sessions = db.collection('sessions');
    const messages = db.collection('messages');

    let history = [];
    const existing = await sessions.findOne({ sessionId });
    if (existing) {
      const msgs = await messages.find({ sessionId }).sort({ timestamp: 1 }).toArray();
      history = msgs.map(m => ({ role: m.role, content: m.content }));
    }

    const systemPrompt = `You are RentPi Assistant. Only answer questions about RentPi rental platform.
Context: ${context}
Never make up numbers. If you don't have data, say so.`;

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ]
    });

    const reply = response.choices[0].message.content;
    const now = new Date();

    // Save to MongoDB
    if (!existing) {
      // Generate session name
      const nameResponse = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: `Give a 3-5 word title for this conversation: "${message}". Reply with ONLY the title, no punctuation.` }],
        max_tokens: 20
      });
      const name = nameResponse.choices[0].message.content.trim();
      await sessions.insertOne({ sessionId, name, createdAt: now, lastMessageAt: now });
    } else {
      await sessions.updateOne({ sessionId }, { $set: { lastMessageAt: now } });
    }

    await messages.insertMany([
      { sessionId, role: 'user', content: message, timestamp: now },
      { sessionId, role: 'assistant', content: reply, timestamp: new Date() }
    ]);

    res.json({ sessionId, reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/chat/sessions', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find().sort({ lastMessageAt: -1 }).toArray();
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/chat/:sessionId/history', async (req, res) => {
  try {
    const session = await db.collection('sessions').findOne({ sessionId: req.params.sessionId });
    const msgs = await db.collection('messages').find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 }).toArray();
    res.json({ sessionId: req.params.sessionId, name: session?.name, messages: msgs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/chat/:sessionId', async (req, res) => {
  try {
    await db.collection('sessions').deleteOne({ sessionId: req.params.sessionId });
    await db.collection('messages').deleteMany({ sessionId: req.params.sessionId });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(8004, () => console.log('agentic-service running on port 8004'));