const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n--- INICIANDO BATERIA DE TESTES AUTOMATIZADOS: PLATAOPLOMO TV ---\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Categories Endpoint
  await test('GET /api/categories retorna canais, filmes e séries', async () => {
    const res = await request('GET', '/api/categories');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.channels), 'Categorias de canais deve ser array');
    assert(Array.isArray(res.data.movies), 'Categorias de filmes deve ser array');
    assert(Array.isArray(res.data.series), 'Categorias de séries deve ser array');
    assert(res.data.channels.length > 0, 'Deve conter categorias');
  });

  // 2. Channels Endpoint
  await test('GET /api/channels retorna lista de canais ao vivo', async () => {
    const res = await request('GET', '/api/channels');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data), 'Canais deve ser array');
    assert(res.data.length >= 10, 'Deve ter pelo menos 10 canais cadastrados');
    const first = res.data[0];
    assert(first.id, 'Canal deve ter id');
    assert(first.name, 'Canal deve ter nome');
    assert(first.streamUrl, 'Canal deve ter URL de stream');
  });

  // 3. Channels Filter by Category
  await test('GET /api/channels?category=sports filtra canais esportivos', async () => {
    const res = await request('GET', '/api/channels?category=sports');
    assert.strictEqual(res.status, 200);
    assert(res.data.length > 0);
    assert(res.data.every(c => c.category === 'sports'), 'Todos devem ser da categoria sports');
  });

  // 4. Channel Details & EPG
  await test('GET /api/channels/:id retorna canal com programação EPG', async () => {
    const res = await request('GET', '/api/channels/premiere-clubes');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, 'premiere-clubes');
    assert(Array.isArray(res.data.schedule), 'Deve conter grade EPG');
  });

  // 5. Movies Endpoint
  await test('GET /api/movies retorna filmes em 4K HDR', async () => {
    const res = await request('GET', '/api/movies');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert(res.data.length >= 5);
    const movie = res.data[0];
    assert(movie.title, 'Filme deve ter título');
    assert(movie.streamUrl, 'Filme deve ter streamUrl');
    assert(movie.synopsis, 'Filme deve ter sinopse');
  });

  // 6. Series Endpoint
  await test('GET /api/series retorna séries com temporadas e episódios', async () => {
    const res = await request('GET', '/api/series');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const serie = res.data[0];
    assert(serie.seasons && serie.seasons.length > 0, 'Série deve ter temporadas');
    assert(serie.seasons[0].episodes && serie.seasons[0].episodes.length > 0, 'Temporada deve ter episódios');
  });

  // 7. Global Search
  await test('GET /api/search?q=Duna busca em canais, filmes e séries', async () => {
    const res = await request('GET', '/api/search?q=Duna');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data.movies), 'Deve retornar filmes');
    assert(res.data.movies.some(m => m.title.includes('Duna')), 'Deve encontrar filme Duna');
  });

  // 8. Admin Login
  let adminToken = '';
  await test('POST /api/admin/login autentica administrador', async () => {
    const res = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'plataoplomo2026'
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.token, 'Deve retornar token');
    adminToken = res.data.token;
  });

  // 9. Catalog Synchronization
  await test('POST /api/sync/run executa sincronização e remove duplicados', async () => {
    const res = await request('POST', '/api/sync/run', {}, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success, 'Sincronização deve ter sucesso');
    assert(res.data.summary.channelsUpdated > 0);
  });

  // 10. Admin Stats
  await test('GET /api/admin/stats retorna telemetria do sistema', async () => {
    const res = await request('GET', '/api/admin/stats');
    assert.strictEqual(res.status, 200);
    assert(res.data.totalChannels > 0);
    assert(res.data.uptimeSeconds >= 0);
    assert(res.data.memoryUsageMB > 0);
  });

  console.log(`\nRESUMO DOS TESTES: ${passed} passaram, ${failed} falharam.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

// If run directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
