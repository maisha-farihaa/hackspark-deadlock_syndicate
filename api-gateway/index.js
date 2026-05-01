const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const services = {
  'user-service': 'http://user-service:8001',
  'rental-service': 'http://rental-service:8002',
  'analytics-service': 'http://analytics-service:8003',
  'agentic-service': 'http://agentic-service:8004',
};

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
  res.json({ service: 'api-gateway', status: 'OK', downstream });
});

app.use('/users', (req, res) => {
  const url = `${services['user-service']}${req.originalUrl}`;
  axios({ method: req.method, url, data: req.body, headers: req.headers })
    .then(r => res.status(r.status).json(r.data))
    .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: 'Service error' }));
});

app.use('/rentals', (req, res) => {
  const url = `${services['rental-service']}${req.originalUrl}`;
  axios({ method: req.method, url, data: req.body, headers: req.headers })
    .then(r => res.status(r.status).json(r.data))
    .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: 'Service error' }));
});

app.use('/analytics', (req, res) => {
  const url = `${services['analytics-service']}${req.originalUrl}`;
  axios({ method: req.method, url, data: req.body, headers: req.headers })
    .then(r => res.status(r.status).json(r.data))
    .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: 'Service error' }));
});

app.use('/chat', (req, res) => {
  const url = `${services['agentic-service']}${req.originalUrl}`;
  axios({ method: req.method, url, data: req.body, headers: req.headers })
    .then(r => res.status(r.status).json(r.data))
    .catch(e => res.status(e.response?.status || 500).json(e.response?.data || { error: 'Service error' }));
});

app.listen(8000, () => console.log('api-gateway running on port 8000'));