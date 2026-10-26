// ========================================================
// PLATAOPLOMO TV — LIVE TV MODULE & EPG SCHEDULE GUIDE
// ========================================================

const LiveModule = {
  channels: [],
  categories: [],
  currentCategory: 'all',
  searchQuery: '',

  async init() {
    await this.loadData();
    this.renderCategoryFilter();
    this.renderChannels();
  },

  async loadData() {
    try {
      const [catsRes, chRes] = await Promise.all([
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/channels').then(r => r.json())
      ]);
      this.categories = catsRes.channels || [];
      this.channels = chRes || [];
    } catch (err) {
      console.error('Error loading live data:', err);
    }
  },

  renderCategoryFilter() {
    const container = document.getElementById('live-categories-bar');
    if (!container) return;
    container.innerHTML = '';

    this.categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `category-pill tv-focusable ${this.currentCategory === cat.id ? 'active' : ''}`;
      pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
      pill.addEventListener('click', () => {
        this.currentCategory = cat.id;
        document.querySelectorAll('#live-categories-bar .category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderChannels();
      });
      container.appendChild(pill);
    });
  },

  renderChannels() {
    const grid = document.getElementById('live-channels-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = this.channels;

    if (this.currentCategory !== 'all') {
      filtered = filtered.filter(c => c.category === this.currentCategory);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted)">
          <div style="font-size: 3rem; margin-bottom: 12px">📡</div>
          <h3>Nenhum canal encontrado nesta categoria</h3>
          <p>Tente selecionar outra categoria ou limpar a busca.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'channel-card tv-focusable';
      
      const isFav = Storage.isFavorite('channels', ch.id);
      const progress = ch.currentShow ? (ch.currentShow.progress || 50) : 50;

      card.innerHTML = `
        <div class="channel-card-top">
          <img src="${ch.logo}" alt="${ch.name}" class="channel-logo-img" loading="lazy">
          <div class="channel-meta-info">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span class="channel-number-tag">CANAL ${ch.number} • ${ch.quality}</span>
              <button class="fav-star-btn" title="Favoritar" style="background:none; border:none; cursor:pointer; color:${isFav ? 'var(--gold)' : 'var(--text-dim)'}; font-size:1.1rem">
                ${isFav ? '★' : '☆'}
              </button>
            </div>
            <div class="channel-name">${ch.name}</div>
          </div>
        </div>
        <div class="channel-card-epg">
          <div class="epg-live-indicator">
            <div class="epg-dot"></div>
            <span>AO VIVO AGORA</span>
          </div>
          <div class="epg-show-title">${ch.currentShow ? ch.currentShow.title : 'Programação Regular'}</div>
          <div class="epg-progress-bar">
            <div class="epg-progress-fill" style="width: ${progress}%"></div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:0.72rem; color:var(--text-muted)">
            <span>${ch.currentShow ? ch.currentShow.start : ''}</span>
            <span>A seguir: ${ch.nextShow ? ch.nextShow.title : 'Programação'}</span>
          </div>
        </div>
      `;

      // Click card -> Play Channel
      card.addEventListener('click', (e) => {
        // If star was clicked, toggle favorite instead
        if (e.target.closest('.fav-star-btn')) {
          const added = Storage.toggleFavorite('channels', ch.id);
          const starBtn = card.querySelector('.fav-star-btn');
          starBtn.innerHTML = added ? '★' : '☆';
          starBtn.style.color = added ? 'var(--gold)' : 'var(--text-dim)';
          App.showToast(added ? `${ch.name} adicionado aos favoritos` : `${ch.name} removido dos favoritos`);
          return;
        }
        Player.playItem(ch, 'live', this.channels);
      });

      grid.appendChild(card);
    });
  }
};

window.LiveModule = LiveModule;
