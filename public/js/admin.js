// ========================================================
// PLATAOPLOMO TV — ADMIN PANEL & STREAM CONTROLLER MODULE
// ========================================================

const AdminModule = {
  stats: null,
  channels: [],
  logs: [],

  async init() {
    this.bindAdminTabs();
    this.bindTesterEvents();
    this.bindSyncEvents();
    this.bindAddChannelEvents();

    if (this.isAuthenticated()) {
      await this.loadDashboardData();
    }
  },

  isAuthenticated() {
    return !!Storage.getAuthToken();
  },

  async checkAuthOrPrompt() {
    if (!this.isAuthenticated()) {
      this.showLoginModal();
      return false;
    }
    await this.loadDashboardData();
    return true;
  },

  showLoginModal() {
    const content = `
      <div style="padding: 32px">
        <span class="badge-tag">Acesso Restrito</span>
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 8px">Painel Administrativo</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px">Faça login com sua chave de administrador para gerenciar fontes de transmissão, canais, catálogo e sincronização.</p>

        <form id="admin-login-form">
          <div class="form-group" style="margin-bottom: 16px">
            <label class="form-label">Usuário</label>
            <input type="text" id="admin-user-input" class="form-input tv-focusable" value="admin" required>
          </div>
          <div class="form-group" style="margin-bottom: 24px">
            <label class="form-label">Senha</label>
            <input type="password" id="admin-pass-input" class="form-input tv-focusable" value="plataoplomo2026" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px">
            <button type="button" class="btn-secondary tv-focusable" id="btn-cancel-login">Cancelar</button>
            <button type="submit" class="btn-gold tv-focusable">Entrar no Painel</button>
          </div>
        </form>
      </div>
    `;

    App.openModal(content);

    document.getElementById('btn-cancel-login')?.addEventListener('click', () => {
      App.closeModal();
      App.navigateTo('home');
    });

    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('admin-user-input').value;
      const pass = document.getElementById('admin-pass-input').value;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (data.success && data.token) {
          Storage.setAuthToken(data.token);
          App.closeModal();
          App.showToast('Login de administrador realizado com sucesso!');
          this.loadDashboardData();
        } else {
          App.showToast(data.error || 'Credenciais inválidas');
        }
      } catch (err) {
        App.showToast('Erro ao comunicar com o servidor');
      }
    });
  },

  async loadDashboardData() {
    try {
      const [statsRes, chRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/channels').then(r => r.json()),
        fetch('/api/sync/logs').then(r => r.json())
      ]);

      this.stats = statsRes;
      this.channels = chRes;
      this.logs = logsRes;

      this.renderMetrics();
      this.renderChannelsTable();
      this.renderSyncLogs();
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  },

  renderMetrics() {
    if (!this.stats) return;
    document.getElementById('metric-total-channels').textContent = this.stats.totalChannels || 0;
    document.getElementById('metric-online-streams').textContent = this.stats.onlineChannels || 0;
    document.getElementById('metric-total-vod').textContent = (this.stats.totalMovies || 0) + (this.stats.totalSeries || 0);
    document.getElementById('metric-server-uptime').textContent = `${Math.floor(this.stats.uptimeSeconds / 60)} min`;
    document.getElementById('metric-server-memory').textContent = `${this.stats.memoryUsageMB} MB`;
  },

  renderChannelsTable() {
    const tbody = document.getElementById('admin-channels-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.channels.forEach(ch => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${ch.logo}" class="table-logo-thumb"></td>
        <td><strong>${ch.name}</strong></td>
        <td><span class="badge-res">${ch.quality}</span></td>
        <td>${ch.category}</td>
        <td><span style="color:var(--green)">● Ativo</span></td>
        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:monospace; font-size:0.75rem">${ch.streamUrl}</td>
        <td>
          <div style="display:flex; gap:6px">
            <button class="btn-secondary btn-test-ch tv-focusable" data-url="${ch.streamUrl}" style="padding:4px 8px; font-size:0.75rem">Testar</button>
            <button class="btn-secondary btn-del-ch tv-focusable" data-id="${ch.id}" style="padding:4px 8px; font-size:0.75rem; color:#ff4d4f">Excluir</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-test-ch')?.addEventListener('click', () => {
        this.runStreamTest(ch.streamUrl);
        // Switch to tester tab
        this.switchTab('tester');
      });

      tr.querySelector('.btn-del-ch')?.addEventListener('click', async () => {
        if (confirm(`Deseja realmente remover o canal "${ch.name}"?`)) {
          await this.deleteChannel(ch.id);
        }
      });

      tbody.appendChild(tr);
    });
  },

  async deleteChannel(id) {
    try {
      const res = await fetch(`/api/channels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Storage.getAuthToken()}` }
      });
      if (res.ok) {
        App.showToast('Canal removido com sucesso');
        this.loadDashboardData();
      }
    } catch (e) {
      App.showToast('Falha ao remover canal');
    }
  },

  renderSyncLogs() {
    const container = document.getElementById('admin-sync-logs-list');
    if (!container) return;
    container.innerHTML = '';

    if (!this.logs || this.logs.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); padding:16px">Nenhum log de sincronização registrado ainda.</div>';
      return;
    }

    this.logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'sync-log-item';
      div.innerHTML = `
        <div class="sync-log-meta">
          <div class="sync-log-title">✅ ${log.source}</div>
          <div class="sync-log-time">${new Date(log.timestamp).toLocaleString('pt-BR')} • Duração: ${log.durationMs}ms</div>
        </div>
        <div style="font-size:0.85rem; color:var(--champagne)">
          <strong>${log.channelsUpdated} canais</strong> • <strong>${log.duplicatesRemoved} duplicados removidos</strong>
        </div>
      `;
      container.appendChild(div);
    });
  },

  bindAdminTabs() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`tab-panel-${tabName}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
  },

  bindTesterEvents() {
    const btn = document.getElementById('btn-run-stream-test');
    if (btn) {
      btn.addEventListener('click', () => {
        const input = document.getElementById('tester-stream-url');
        if (input && input.value) {
          this.runStreamTest(input.value.trim());
        }
      });
    }
  },

  async runStreamTest(url) {
    const resultBox = document.getElementById('tester-result-box');
    const input = document.getElementById('tester-stream-url');
    if (input) input.value = url;

    if (!resultBox) return;
    resultBox.className = 'tester-result-card';
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; color:var(--gold)">
        <div class="stream-spinner" style="width:24px; height:24px"></div>
        <span>Testando fonte de vídeo e medindo latência...</span>
      </div>
    `;

    try {
      const res = await fetch('/api/stream/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (data.isWorking) {
        resultBox.className = 'tester-result-card success';
        resultBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
            <strong style="color:var(--green)">✅ STREAM ATIVO E DISPONÍVEL</strong>
            <span style="font-weight:700">Latência: ${data.latencyMs}ms</span>
          </div>
          <div><strong>Status HTTP:</strong> ${data.statusCode} OK</div>
          <div><strong>Content-Type:</strong> ${data.contentType || 'application/vnd.apple.mpegurl'}</div>
          <div style="margin-top:10px">
            <button class="btn-gold" id="btn-preview-tested-stream" style="padding:6px 14px; font-size:0.8rem">▶ Reproduzir Teste Agora</button>
          </div>
        `;

        document.getElementById('btn-preview-tested-stream')?.addEventListener('click', () => {
          Player.playItem({
            name: 'Teste de Transmissão',
            streamUrl: url,
            format: 'HLS'
          }, 'live');
        });
      } else {
        resultBox.className = 'tester-result-card error';
        resultBox.innerHTML = `
          <strong style="color:#ff4d4f">❌ FALHA NA FONTE DE TRANSMISSÃO</strong>
          <div style="margin-top:6px">${data.message}</div>
          <div style="font-size:0.8rem; margin-top:4px">Código: ${data.statusCode} • Tempo de resposta: ${data.latencyMs}ms</div>
        `;
      }
    } catch (e) {
      resultBox.className = 'tester-result-card error';
      resultBox.innerHTML = `<strong style="color:#ff4d4f">Erro de conexão ao testador:</strong> ${e.message}`;
    }
  },

  bindSyncEvents() {
    const syncBtn = document.getElementById('btn-trigger-catalog-sync');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span>⏳ Sincronizando catálogo...</span>';

        try {
          const res = await fetch('/api/sync/run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Storage.getAuthToken()}`
            },
            body: JSON.stringify({ source: 'Sincronizador Automático de Catálogo Plataoplomo TV' })
          });
          const data = await res.json();
          if (data.success) {
            App.showToast('Catálogo sincronizado com sucesso!');
            await this.loadDashboardData();
          } else {
            App.showToast(data.error || 'Erro na sincronização');
          }
        } catch (e) {
          App.showToast('Falha ao comunicar com o servidor');
        } finally {
          syncBtn.disabled = false;
          syncBtn.innerHTML = '<span>⚡ Executar Sincronização Agora</span>';
        }
      });
    }
  },

  bindAddChannelEvents() {
    const form = document.getElementById('form-add-channel');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCh = {
          name: document.getElementById('new-ch-name').value,
          number: parseInt(document.getElementById('new-ch-number').value) || 1,
          category: document.getElementById('new-ch-category').value,
          quality: document.getElementById('new-ch-quality').value,
          streamUrl: document.getElementById('new-ch-stream').value,
          logo: document.getElementById('new-ch-logo').value || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120',
          description: document.getElementById('new-ch-desc').value || ''
        };

        try {
          const res = await fetch('/api/channels', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Storage.getAuthToken()}`
            },
            body: JSON.stringify(newCh)
          });
          if (res.ok) {
            App.showToast(`Canal "${newCh.name}" adicionado com sucesso!`);
            form.reset();
            await this.loadDashboardData();
            this.switchTab('channels');
          } else {
            App.showToast('Erro ao cadastrar canal');
          }
        } catch (err) {
          App.showToast('Falha ao comunicar com o servidor');
        }
      });
    }
  }
};

window.AdminModule = AdminModule;
