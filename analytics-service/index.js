const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

const headers = () => ({ Authorization: `Bearer ${CENTRAL_API_TOKEN}` });

app.get('/status', (req, res) => {
  res.json({ service: 'analytics-service', status: 'OK' });
});

// P11: Peak Window
app.get('/analytics/peak-window', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  try {
    const months = [];
    let current = new Date(from + '-01');
    const end = new Date(to + '-01');
    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    if (months.length > 12) return res.status(400).json({ error: 'Max range is 12 months' });

    const dateCounts = {};
    for (const month of months) {
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals/stats`, {
        headers: headers(), params: { group_by: 'date', month }
      });
      for (const d of data.data) dateCounts[d.date] = d.count;
    }

    const fromDate = new Date(from + '-01');
    const toDate = new Date(to + '-01');
    toDate.setMonth(toDate.getMonth() + 1);
    toDate.setDate(toDate.getDate() - 1);

    const allDates = [];
    let cur = new Date(fromDate);
    while (cur <= toDate) {
      const key = cur.toISOString().split('T')[0];
      allDates.push({ date: key, count: dateCounts[key] || 0 });
      cur.setDate(cur.getDate() + 1);
    }

    if (allDates.length < 7) return res.status(400).json({ error: 'Not enough data for a 7-day window' });

    let windowSum = allDates.slice(0, 7).reduce((s, d) => s + d.count, 0);
    let maxSum = windowSum;
    let maxStart = 0;

    for (let i = 7; i < allDates.length; i++) {
      windowSum += allDates[i].count - allDates[i - 7].count;
      if (windowSum > maxSum) { maxSum = windowSum; maxStart = i - 6; }
    }

    res.json({
      from, to,
      peakWindow: {
        from: allDates[maxStart].date,
        to: allDates[maxStart + 6].date,
        totalRentals: maxSum
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P13: Surge Days
app.get('/analytics/surge-days', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month required' });

  try {
    const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals/stats`, {
      headers: headers(), params: { group_by: 'date', month }
    });

    const countMap = {};
    for (const d of data.data) countMap[d.date] = d.count;

    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      days.push({ date, count: countMap[date] || 0 });
    }

    // Monotonic stack
    const result = days.map(d => ({ ...d, nextSurgeDate: null, daysUntil: null }));
    const stack = [];
    for (let i = 0; i < days.length; i++) {
      while (stack.length && days[i].count > days[stack[stack.length - 1]].count) {
        const idx = stack.pop();
        result[idx].nextSurgeDate = days[i].date;
        result[idx].daysUntil = i - idx;
      }
      stack.push(i);
    }

    res.json({ month, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P14: Recommendations
app.get('/analytics/recommendations', async (req, res) => {
  const { date, limit = 10 } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });

  try {
    const target = new Date(date);
    const productCounts = {};

    for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
      const windowStart = new Date(target);
      windowStart.setFullYear(windowStart.getFullYear() - yearOffset);
      windowStart.setDate(windowStart.getDate() - 7);

      const windowEnd = new Date(target);
      windowEnd.setFullYear(windowEnd.getFullYear() - yearOffset);
      windowEnd.setDate(windowEnd.getDate() + 7);

      let page = 1;
      while (true) {
        const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals`, {
          headers: headers(),
          params: {
            from: windowStart.toISOString().split('T')[0],
            to: windowEnd.toISOString().split('T')[0],
            page, limit: 100
          }
        });
        for (const r of data.data) {
          productCounts[r.productId] = (productCounts[r.productId] || 0) + 1;
        }
        if (page >= data.totalPages) break;
        page++;
      }
    }

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(limit));

    if (!topProducts.length) return res.json({ date, recommendations: [] });

    const ids = topProducts.map(([id]) => id);
    const { data: batchData } = await axios.get(`${CENTRAL_API_URL}/api/data/products/batch`, {
      headers: headers(), params: { ids: ids.join(',') }
    });

    const productMap = {};
    for (const p of batchData.data) productMap[p.id] = p;

    const recommendations = topProducts.map(([id, score]) => ({
      productId: parseInt(id),
      name: productMap[id]?.name,
      category: productMap[id]?.category,
      score
    })).filter(r => r.name);

    res.json({ date, recommendations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(8003, () => console.log('analytics-service running on port 8003'));