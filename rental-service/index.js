const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

const headers = () => ({ Authorization: `Bearer ${CENTRAL_API_TOKEN}` });

// Cache for categories
let categoriesCache = null;

async function getCategories() {
  if (categoriesCache) return categoriesCache;
  const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/categories`, { headers: headers() });
  categoriesCache = data.categories;
  return categoriesCache;
}

app.get('/status', (req, res) => {
  res.json({ service: 'rental-service', status: 'OK' });
});

// P3: Product Proxy
app.get('/rentals/products', async (req, res) => {
  try {
    const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/products`, {
      headers: headers(), params: req.query
    });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

app.get('/rentals/products/:id', async (req, res) => {
  try {
    const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/products/${req.params.id}`, {
      headers: headers()
    });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// P5: Paginated Product Listing with Category Filter
app.get('/rentals/products', async (req, res) => {
  try {
    const categories = await getCategories();
    if (req.query.category && !categories.includes(req.query.category)) {
      return res.status(400).json({
        error: `Invalid category. Valid options: ${categories.join(', ')}`
      });
    }
    const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/products`, {
      headers: headers(), params: req.query
    });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// P7: Availability
app.get('/rentals/products/:id/availability', async (req, res) => {
  const { from, to } = req.query;
  const productId = parseInt(req.params.id);
  try {
    let allRentals = [];
    let page = 1;
    while (true) {
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals`, {
        headers: headers(), params: { product_id: productId, page, limit: 100 }
      });
      allRentals = allRentals.concat(data.data);
      if (page >= data.totalPages) break;
      page++;
    }

    // Merge overlapping intervals
    const intervals = allRentals.map(r => ({
      start: new Date(r.rentalStart),
      end: new Date(r.rentalEnd)
    })).sort((a, b) => a.start - b.start);

    const merged = [];
    for (const interval of intervals) {
      if (merged.length && interval.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = new Date(Math.max(merged[merged.length - 1].end, interval.end));
      } else {
        merged.push({ ...interval });
      }
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const busyPeriods = merged
      .filter(i => i.start <= toDate && i.end >= fromDate)
      .map(i => ({ start: i.start.toISOString().split('T')[0], end: i.end.toISOString().split('T')[0] }));

    const available = busyPeriods.length === 0 || !busyPeriods.some(b =>
      new Date(b.start) <= toDate && new Date(b.end) >= fromDate
    );

    // Free windows
    const freeWindows = [];
    let cursor = fromDate;
    for (const busy of busyPeriods) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      if (cursor < busyStart) {
        freeWindows.push({
          start: cursor.toISOString().split('T')[0],
          end: new Date(busyStart - 86400000).toISOString().split('T')[0]
        });
      }
      cursor = new Date(busyEnd.getTime() + 86400000);
    }
    if (cursor <= toDate) {
      freeWindows.push({
        start: cursor.toISOString().split('T')[0],
        end: toDate.toISOString().split('T')[0]
      });
    }

    res.json({ productId, from, to, available, busyPeriods, freeWindows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P8: Kth Busiest Date
app.get('/rentals/kth-busiest-date', async (req, res) => {
  const { from, to, k } = req.query;
  if (!from || !to || !k) return res.status(400).json({ error: 'from, to, k required' });
  const kNum = parseInt(k);
  if (isNaN(kNum) || kNum < 1) return res.status(400).json({ error: 'k must be positive integer' });

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
      for (const d of data.data) {
        dateCounts[d.date] = (dateCounts[d.date] || 0) + d.count;
      }
    }

    const sorted = Object.entries(dateCounts).sort((a, b) => b[1] - a[1]);
    if (kNum > sorted.length) return res.status(404).json({ error: 'k exceeds available dates' });

    const [date, rentalCount] = sorted[kNum - 1];
    res.json({ from, to, k: kNum, date, rentalCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P9: Top Categories
app.get('/rentals/users/:id/top-categories', async (req, res) => {
  const { k } = req.query;
  const kNum = parseInt(k);
  if (isNaN(kNum) || kNum < 1) return res.status(400).json({ error: 'k must be positive integer' });

  try {
    let allRentals = [];
    let page = 1;
    while (true) {
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals`, {
        headers: headers(), params: { renter_id: req.params.id, page, limit: 100 }
      });
      allRentals = allRentals.concat(data.data);
      if (page >= data.totalPages) break;
      page++;
    }

    if (!allRentals.length) return res.json({ userId: req.params.id, topCategories: [] });

    const productIds = [...new Set(allRentals.map(r => r.productId))];
    const productMap = {};
    for (let i = 0; i < productIds.length; i += 50) {
      const batch = productIds.slice(i, i + 50);
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/products/batch`, {
        headers: headers(), params: { ids: batch.join(',') }
      });
      for (const p of data.data) productMap[p.id] = p.category;
    }

    const categoryCounts = {};
    for (const rental of allRentals) {
      const cat = productMap[rental.productId];
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const sorted = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, kNum)
      .map(([category, rentalCount]) => ({ category, rentalCount }));

    res.json({ userId: parseInt(req.params.id), topCategories: sorted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P10: Longest Free Streak
app.get('/rentals/products/:id/free-streak', async (req, res) => {
  const { year } = req.query;
  const productId = parseInt(req.params.id);
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  try {
    let allRentals = [];
    let page = 1;
    while (true) {
      const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals`, {
        headers: headers(), params: { product_id: productId, page, limit: 100 }
      });
      allRentals = allRentals.concat(data.data);
      if (page >= data.totalPages) break;
      page++;
    }

    const intervals = allRentals
      .map(r => ({ start: new Date(r.rentalStart), end: new Date(r.rentalEnd) }))
      .filter(i => i.start <= yearEnd && i.end >= yearStart)
      .map(i => ({ start: new Date(Math.max(i.start, yearStart)), end: new Date(Math.min(i.end, yearEnd)) }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const i of intervals) {
      if (merged.length && i.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = new Date(Math.max(merged[merged.length - 1].end, i.end));
      } else merged.push({ ...i });
    }

    let longest = { from: yearStart, to: yearEnd, days: Math.round((yearEnd - yearStart) / 86400000) + 1 };
    let cursor = yearStart;
    for (const busy of merged) {
      if (cursor < busy.start) {
        const days = Math.round((busy.start - cursor) / 86400000);
        if (days > longest.days) {
          longest = { from: cursor, to: new Date(busy.start - 86400000), days };
        }
      }
      cursor = new Date(busy.end.getTime() + 86400000);
    }
    if (cursor <= yearEnd) {
      const days = Math.round((yearEnd - cursor) / 86400000) + 1;
      if (days > longest.days) longest = { from: cursor, to: yearEnd, days };
    }

    res.json({
      productId,
      year: parseInt(year),
      longestFreeStreak: {
        from: longest.from.toISOString().split('T')[0],
        to: longest.to.toISOString().split('T')[0],
        days: longest.days
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// P12: Merged Feed
app.get('/rentals/merged-feed', async (req, res) => {
  const { productIds, limit = 30 } = req.query;
  if (!productIds) return res.status(400).json({ error: 'productIds required' });
  const ids = [...new Set(productIds.split(',').map(Number))];
  if (ids.length > 10) return res.status(400).json({ error: 'Max 10 productIds' });
  const limitNum = parseInt(limit);

  try {
    const streams = await Promise.all(ids.map(async id => {
      let all = [];
      let page = 1;
      while (true) {
        const { data } = await axios.get(`${CENTRAL_API_URL}/api/data/rentals`, {
          headers: headers(), params: { product_id: id, page, limit: 100 }
        });
        all = all.concat(data.data);
        if (page >= data.totalPages) break;
        page++;
      }
      return all.sort((a, b) => new Date(a.rentalStart) - new Date(b.rentalStart));
    }));

    // Merge K sorted arrays
    const indices = new Array(streams.length).fill(0);
    const feed = [];
    while (feed.length < limitNum) {
      let minIdx = -1;
      let minDate = null;
      for (let i = 0; i < streams.length; i++) {
        if (indices[i] < streams[i].length) {
          const date = new Date(streams[i][indices[i]].rentalStart);
          if (!minDate || date < minDate) { minDate = date; minIdx = i; }
        }
      }
      if (minIdx === -1) break;
      const r = streams[minIdx][indices[minIdx]];
      feed.push({ rentalId: r.id, productId: r.productId, rentalStart: r.rentalStart, rentalEnd: r.rentalEnd });
      indices[minIdx]++;
    }

    res.json({ productIds: ids, limit: limitNum, feed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(8002, () => console.log('rental-service running on port 8002'));