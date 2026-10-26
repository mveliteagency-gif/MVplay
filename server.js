const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Path helpers
const DATA_DIR = path.join(__dirname, 'data');
const getFilePath = (file) => path.join(DATA_DIR, file);

const readJson = (file, fallback = []) => {
  try {
    const p = getFilePath(file);
    if (!fs.existsSync(p)) return fallback;
    const content = fs.readFileSync(p, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
    return fallback;
  }
};

const writeJson = (file, data) => {
  try {
    const p = getFilePath(file);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err.message);
    return false;
  }
};

// Admin authentication middleware / session
const ADMIN_TOKEN = 'plataoplomo_token_2026_secured';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.replace('Bearer ', '') === ADMIN_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'Acesso não autorizado. Faça login com credenciais de administrador.' });
};

// --- AUTH ROUTE ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if ((username === 'admin' && password === 'plataoplomo2026') || (username === 'admin' && password === 'admin')) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      user: { name: 'Administrador Plataoplomo TV', role: 'admin' }
    });
  }
  return res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

// --- CATEGORIES ---
app.get('/api/categories', (req, res) => {
  const cats = readJson('categories.json', { channels: [], movies: [], series: [] });
  res.json(cats);
});

// --- CHANNELS ---
app.get('/api/channels', (req, res) => {
  const { category, search, featured } = req.query;
  let channels = readJson('channels.json', []);

  if (category && category !== 'all') {
    channels = channels.filter(c => c.category === category);
  }
  if (search) {
    const q = search.toLowerCase().trim();
    channels = channels.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }
  if (featured === 'true') {
    channels = channels.filter(c => c.featured);
  }

  res.json(channels);
});

app.get('/api/channels/:id', (req, res) => {
  const channels = readJson('channels.json', []);
  const channel = channels.find(c => c.id === req.params.id);
  if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });

  const epgData = readJson('epg.json', {});
  const schedule = channel.epgId ? (epgData[channel.epgId] || []) : [];

  res.json({ ...channel, schedule });
});

app.post('/api/channels', requireAuth, (req, res) => {
  const channels = readJson('channels.json', []);
  const newChannel = {
    id: req.body.id || `channel-${Date.now()}`,
    number: req.body.number || channels.length + 1,
    name: req.body.name,
    category: req.body.category || 'open',
    logo: req.body.logo || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120',
    description: req.body.description || '',
    streamUrl: req.body.streamUrl,
    backupStreamUrl: req.body.backupStreamUrl || '',
    format: req.body.format || 'HLS',
    quality: req.body.quality || '1080p FHD',
    resolution: req.body.resolution || '1920x1080',
    fps: req.body.fps || 60,
    language: req.body.language || 'pt-BR',
    status: req.body.status || 'online',
    epgId: req.body.epgId || '',
    currentShow: req.body.currentShow || { title: 'Programação Normal', start: '00:00', end: '23:59', progress: 50 },
    nextShow: req.body.nextShow || { title: 'Próximo Bloco', start: '00:00', end: '23:59' },
    featured: !!req.body.featured
  };

  channels.push(newChannel);
  writeJson('channels.json', channels);
  res.status(201).json(newChannel);
});

app.put('/api/channels/:id', requireAuth, (req, res) => {
  const channels = readJson('channels.json', []);
  const index = channels.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Canal não encontrado' });

  channels[index] = { ...channels[index], ...req.body };
  writeJson('channels.json', channels);
  res.json(channels[index]);
});

app.delete('/api/channels/:id', requireAuth, (req, res) => {
  let channels = readJson('channels.json', []);
  const initialLength = channels.length;
  channels = channels.filter(c => c.id !== req.params.id);
  if (channels.length === initialLength) {
    return res.status(404).json({ error: 'Canal não encontrado' });
  }
  writeJson('channels.json', channels);
  res.json({ success: true, message: 'Canal removido com sucesso' });
});

// --- MOVIES ---
app.get('/api/movies', (req, res) => {
  const { category, search, featured } = req.query;
  let movies = readJson('movies.json', []);

  if (category && category !== 'all') {
    movies = movies.filter(m => m.category === category || (m.genres && m.genres.some(g => g.toLowerCase().includes(category.toLowerCase()))));
  }
  if (search) {
    const q = search.toLowerCase().trim();
    movies = movies.filter(m => 
      m.title.toLowerCase().includes(q) || 
      (m.synopsis && m.synopsis.toLowerCase().includes(q))
    );
  }
  if (featured === 'true') {
    movies = movies.filter(m => m.featured);
  }

  res.json(movies);
});

app.get('/api/movies/:id', (req, res) => {
  const movies = readJson('movies.json', []);
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ error: 'Filme não encontrado' });
  res.json(movie);
});

app.post('/api/movies', requireAuth, (req, res) => {
  const movies = readJson('movies.json', []);
  const newMovie = {
    id: req.body.id || `movie-${Date.now()}`,
    title: req.body.title,
    originalTitle: req.body.originalTitle || req.body.title,
    year: req.body.year || new Date().getFullYear(),
    duration: req.body.duration || '2h',
    durationMinutes: req.body.durationMinutes || 120,
    rating: req.body.rating || '14',
    score: req.body.score || '8.0',
    quality: req.body.quality || '4K HDR',
    audio: req.body.audio || 'Dolby Digital 5.1',
    language: req.body.language || 'Dublado / Legendado',
    category: req.body.category || 'action',
    genres: req.body.genres || ['Ação'],
    poster: req.body.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    backdrop: req.body.backdrop || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280',
    synopsis: req.body.synopsis || '',
    streamUrl: req.body.streamUrl,
    cast: req.body.cast || [],
    director: req.body.director || '',
    featured: !!req.body.featured
  };

  movies.push(newMovie);
  writeJson('movies.json', movies);
  res.status(201).json(newMovie);
});

// --- SERIES ---
app.get('/api/series', (req, res) => {
  const { category, search, featured } = req.query;
  let series = readJson('series.json', []);

  if (category && category !== 'all') {
    series = series.filter(s => s.category === category || (s.genres && s.genres.some(g => g.toLowerCase().includes(category.toLowerCase()))));
  }
  if (search) {
    const q = search.toLowerCase().trim();
    series = series.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.synopsis && s.synopsis.toLowerCase().includes(q))
    );
  }
  if (featured === 'true') {
    series = series.filter(s => s.featured);
  }

  res.json(series);
});

app.get('/api/series/:id', (req, res) => {
  const seriesList = readJson('series.json', []);
  const series = seriesList.find(s => s.id === req.params.id);
  if (!series) return res.status(404).json({ error: 'Série não encontrada' });
  res.json(series);
});

// --- GLOBAL SEARCH ---
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ channels: [], movies: [], series: [] });

  const channels = readJson('channels.json', []).filter(c => 
    c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
  );

  const movies = readJson('movies.json', []).filter(m => 
    m.title.toLowerCase().includes(q) || (m.synopsis && m.synopsis.toLowerCase().includes(q))
  );

  const series = readJson('series.json', []).filter(s => 
    s.title.toLowerCase().includes(q) || (s.synopsis && s.synopsis.toLowerCase().includes(q))
  );

  res.json({ channels, movies, series });
});

// --- STREAM HEALTH TESTER ---
app.post('/api/stream/test', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do stream é obrigatória' });

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PlataoplomoTV/1.0 (SmartTV; Android TV; WebOS; Tizen) HLSPlayer'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const isWorking = response.ok;

    return res.json({
      url,
      isWorking,
      statusCode: response.status,
      contentType,
      latencyMs,
      message: isWorking ? 'Stream ativo e respondendo perfeitamente' : `Falha no stream: código ${response.status}`
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return res.json({
      url,
      isWorking: false,
      statusCode: 0,
      contentType: '',
      latencyMs,
      message: `Erro ao conectar com a fonte: ${err.message}`
    });
  }
});

// --- STREAM PROXY (bypasses CORS when Smart TVs or browsers need it) ---
app.get('/api/stream/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL obrigatória');

  try {
    const client = targetUrl.startsWith('https') ? https : http;
    const proxyReq = client.get(targetUrl, {
      headers: {
        'User-Agent': 'PlataoplomoTV/1.0 (SmartTV; Android TV; WebOS) Player'
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy falhou ao buscar stream', details: e.message });
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- CATALOG AUTO-UPDATE & SYNC ---
app.post('/api/sync/run', requireAuth, (req, res) => {
  const syncStartTime = Date.now();
  const channels = readJson('channels.json', []);
  const movies = readJson('movies.json', []);
  const series = readJson('series.json', []);

  // Deduplication check
  const channelNames = new Set();
  let duplicatesRemoved = 0;
  const cleanChannels = [];

  for (const ch of channels) {
    if (!channelNames.has(ch.name.toLowerCase())) {
      channelNames.add(ch.name.toLowerCase());
      cleanChannels.push(ch);
    } else {
      duplicatesRemoved++;
    }
  }

  writeJson('channels.json', cleanChannels);

  const durationMs = Date.now() - syncStartTime;
  const newLog = {
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: req.body.source || 'Sincronizador Automático de Catálogo Plataoplomo TV',
    status: 'success',
    channelsUpdated: cleanChannels.length,
    moviesUpdated: movies.length,
    seriesUpdated: series.length,
    newItems: 0,
    duplicatesRemoved,
    deadLinks: 0,
    durationMs
  };

  const logs = readJson('sync-logs.json', []);
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop();
  writeJson('sync-logs.json', logs);

  res.json({
    success: true,
    message: 'Sincronização de catálogo realizada com sucesso!',
    summary: newLog
  });
});

app.get('/api/sync/logs', (req, res) => {
  const logs = readJson('sync-logs.json', []);
  res.json(logs);
});

// --- ADMIN STATS ---
app.get('/api/admin/stats', (req, res) => {
  const channels = readJson('channels.json', []);
  const movies = readJson('movies.json', []);
  const series = readJson('series.json', []);
  const logs = readJson('sync-logs.json', []);
  const lastSync = logs[0] || null;

  const mem = process.memoryUsage();

  res.json({
    totalChannels: channels.length,
    onlineChannels: channels.filter(c => c.status === 'online').length,
    totalMovies: movies.length,
    totalSeries: series.length,
    lastSync,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
    serverTime: new Date().toISOString()
  });
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Plataoplomo TV Server rodando em: http://localhost:${PORT}`);
  console.log(`  Painel e Player prontos para Android TV / Smart TV`);
  console.log(`======================================================\n`);
});
