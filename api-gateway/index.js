const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ✅ Use Docker service URLs (env based)
const services = {
  'user-service': process.env.USER_SERVICE_URL || 'http://user-service:8001',
  'rental-service': process.env.RENTAL_SERVICE_URL || 'http://rental-service:8002',
  'analytics-service': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8003',
  'agentic-service': process.env.AGENTIC_SERVICE_URL || 'http://agentic-service:8004',
};

// ---------------- STATUS ----------------
app.get('/status', async (req, res) => {
  const downstream = {};

  await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        await axios.get(`${url}/status`, { timeout: 3000 });
        downstream[name] = 'OK';
      } catch {
        downstream[name] = 'UNREACHABLE';
      }
    })
  );

  res.json({
    service: 'api-gateway',
    status: 'OK',
    downstream
  });
});

// ---------------- USER ROUTES ----------------
app.use('/users', async (req, res) => {
  try {
    const url = `${services['user-service']}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: req.headers
    });

    res.status(response.status).json(response.data);

  } catch (e) {
    res.status(e.response?.status || 500).json(
      e.response?.data || { error: 'User service error' }
    );
  }
});

// ---------------- RENTAL ROUTES ----------------
app.use('/rentals', async (req, res) => {
  try {
    const url = `${services['rental-service']}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: req.headers
    });

    res.status(response.status).json(response.data);

  } catch (e) {
    res.status(e.response?.status || 500).json(
      e.response?.data || { error: 'Rental service error' }
    );
  }
});

// ---------------- ANALYTICS ROUTES ----------------
app.use('/analytics', async (req, res) => {
  try {
    const url = `${services['analytics-service']}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: req.headers
    });

    res.status(response.status).json(response.data);

  } catch (e) {
    res.status(e.response?.status || 500).json(
      e.response?.data || { error: 'Analytics service error' }
    );
  }
});

// ---------------- AGENTIC ROUTES ----------------
app.use('/chat', async (req, res) => {
  try {
    const url = `${services['agentic-service']}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: req.headers
    });

    res.status(response.status).json(response.data);

  } catch (e) {
    res.status(e.response?.status || 500).json(
      e.response?.data || { error: 'Agentic service error' }
    );
  }
});

// ---------------- START ----------------
app.listen(8000, () => {
  console.log('api-gateway running on port 8000');
});