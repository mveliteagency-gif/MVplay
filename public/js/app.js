// ========================================================
// PLATAOPLOMO TV — MAIN APPLICATION CONTROLLER
// ========================================================

const App = {
  currentPage: 'home',
  allChannels: [],
  allMovies: [],
  allSeries: [],

  async init() {
    console.log('Iniciando Plataoplomo TV...');

    // Initialize Subsystems
    Player.init();
    Remote.init();
    SearchModule.init();

    // Bind Navigation & UI Buttons
    this.bindNavLinks();
    this.bindGlobalButtons();

    // Load initial home page data
    await this.loadInitialData();
    this.renderHomePage();

    // Handle URL Hash Navigation
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.replace('#', '') || 'home';
      this.navigateTo(page, false);
    });

    // Check if initial hash exists
    if (window.location.hash) {
      const initPage = window.location.hash.replace('#', '');
      this.navigateTo(initPage, false);
    }
  },

  async loadInitialData() {
    try {
      const [chRes, mvRes, srRes] = await Promise.all([
        fetch('/api/channels').then(r => r.json()),
        fetch('/api/movies').then(r => r.json()),
        fetch('/api/series').then(r => r.json())
      ]);
      this.allChannels = chRes || [];
      this.allMovies = mvRes || [];
      this.allSeries = srRes || [];
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    }
  },

  bindNavLinks() {
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.dataset.route;
        this.navigateTo(route);
      });
    });
  },

  bindGlobalButtons() {
    // TV Mode Toggle in Header
    document.getElementById('tv-mode-indicator')?.addEventListener('click', () => {
      Remote.toggleTvMode();
    });

    // Teste Gratis CTA button
    document.querySelectorAll('.btn-teste-gratis').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openFreeTrialModal();
      });
    });

    // Modal Close Button
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.closeModal();
      }
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
      this.closeModal();
    });
  },

  navigateTo(pageName, updateHash = true) {
    if (pageName === 'admin') {
      AdminModule.checkAuthOrPrompt();
    }

    this.currentPage = pageName;
    if (updateHash) {
      window.location.hash = pageName;
    }

    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.route === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hide all pages, show active page
    document.querySelectorAll('.app-page').forEach(page => {
      page.style.display = 'none';
    });

    const activePageEl = document.getElementById(`page-${pageName}`);
    if (activePageEl) {
      activePageEl.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific initializers
    switch (pageName) {
      case 'home':
        this.renderHomePage();
        break;
      case 'live':
        LiveModule.init();
        break;
      case 'movies':
      case 'series':
        VodModule.init();
        break;
      case 'search':
        document.getElementById('global-search-input')?.focus();
        break;
      case 'mylist':
        this.renderMyListPage();
        break;
      case 'settings':
        this.renderSettingsPage();
        break;
      case 'admin':
        AdminModule.init();
        break;
    }

    // Refresh TV focusables for remote control
    setTimeout(() => {
      Remote.focusFirstAvailable();
    }, 150);
  },

  // --- HOME PAGE RENDERING ---
  renderHomePage() {
    this.renderHeroSpotlight();
    this.renderContinueWatching();
    this.renderSportsCarousel();
    this.renderMoviesCarousel();
    this.renderSeriesCarousel();
    this.renderPopularChannels();
  },

  renderHeroSpotlight() {
    const featuredMovie = this.allMovies.find(m => m.featured) || this.allMovies[0];
    const heroWrap = document.getElementById('home-hero-spotlight');
    if (!heroWrap || !featuredMovie) return;

    heroWrap.style.backgroundImage = `url('${featuredMovie.backdrop}')`;
    heroWrap.innerHTML = `
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="badge-tag">⚡ Destaque em 4K HDR</span>
        <h1 class="hero-title">${featuredMovie.title}</h1>
        <div class="hero-meta">
          <span class="badge-res">${featuredMovie.quality}</span>
          <span>★ ${featuredMovie.score}</span>
          <span>•</span>
          <span>${featuredMovie.year}</span>
          <span>•</span>
          <span>${featuredMovie.duration}</span>
          <span>•</span>
          <span>${featuredMovie.genres ? featuredMovie.genres.join(', ') : ''}</span>
        </div>
        <p class="hero-desc">${featuredMovie.synopsis}</p>
        <div class="hero-buttons">
          <button class="btn-gold tv-focusable" id="hero-btn-play">
            <span>▶ Assistir Agora</span>
          </button>
          <button class="btn-secondary tv-focusable" id="hero-btn-details">
            <span>ℹ Mais Informações</span>
          </button>
          <button class="btn-secondary tv-focusable btn-teste-gratis">
            <span>💬 Teste Grátis 6h</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('hero-btn-play')?.addEventListener('click', () => {
      Player.playItem(featuredMovie, 'vod');
    });
    document.getElementById('hero-btn-details')?.addEventListener('click', () => {
      VodModule.openMovieDetails(featuredMovie);
    });
  },

  renderContinueWatching() {
    const rowWrap = document.getElementById('row-continue-watching');
    const container = document.getElementById('carousel-continue-watching');
    if (!rowWrap || !container) return;

    const history = Storage.getHistory();
    if (history.length === 0) {
      rowWrap.style.display = 'none';
      return;
    }

    rowWrap.style.display = 'block';
    container.innerHTML = '';

    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'media-card tv-focusable';
      card.innerHTML = `
        <div class="media-poster-wrap">
          <img src="${item.poster}" class="media-poster">
          <div style="position:absolute; bottom:0; left:0; right:0; height:6px; background:rgba(255,255,255,0.2)">
            <div style="height:100%; width:${item.progressPercent}%; background:var(--gold-gradient)"></div>
          </div>
        </div>
        <div class="media-info">
          <div class="media-title">${item.title}</div>
          <div style="font-size:0.75rem; color:var(--champagne)">${item.progressPercent}% assistido</div>
        </div>
      `;

      card.addEventListener('click', () => {
        const fullItem = this.allMovies.find(m => m.id === item.id) || this.allChannels.find(c => c.id === item.id);
        if (fullItem) {
          Player.playItem(fullItem, fullItem.category ? 'live' : 'vod');
        }
      });

      container.appendChild(card);
    });
  },

  renderSportsCarousel() {
    const container = document.getElementById('carousel-sports');
    if (!container) return;
    container.innerHTML = '';

    const sportsChannels = this.allChannels.filter(c => c.category === 'sports');
    sportsChannels.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'channel-card tv-focusable';
      card.innerHTML = `
        <div class="channel-card-top">
          <img src="${ch.logo}" class="channel-logo-img">
          <div class="channel-meta-info">
            <span class="channel-number-tag">CANAL ${ch.number} • ${ch.quality}</span>
            <div class="channel-name">${ch.name}</div>
          </div>
        </div>
        <div class="channel-card-epg">
          <div class="epg-live-indicator"><div class="epg-dot"></div><span>AO VIVO</span></div>
          <div class="epg-show-title">${ch.currentShow ? ch.currentShow.title : 'Ao Vivo'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        Player.playItem(ch, 'live', this.allChannels);
      });
      container.appendChild(card);
    });
  },

  renderMoviesCarousel() {
    const container = document.getElementById('carousel-movies');
    if (!container) return;
    container.innerHTML = '';

    this.allMovies.slice(0, 6).forEach(movie => {
      const card = document.createElement('div');
      card.className = 'media-card tv-focusable';
      card.innerHTML = `
        <div class="media-poster-wrap">
          <img src="${movie.poster}" class="media-poster">
          <div class="media-badge-quality">${movie.quality}</div>
          <div class="media-score-badge">★ ${movie.score}</div>
        </div>
        <div class="media-info">
          <div class="media-title">${movie.title}</div>
          <div class="media-submeta"><span>${movie.year}</span><span>${movie.duration}</span></div>
        </div>
      `;
      card.addEventListener('click', () => {
        VodModule.openMovieDetails(movie);
      });
      container.appendChild(card);
    });
  },

  renderSeriesCarousel() {
    const container = document.getElementById('carousel-series');
    if (!container) return;
    container.innerHTML = '';

    this.allSeries.slice(0, 6).forEach(serie => {
      const card = document.createElement('div');
      card.className = 'media-card tv-focusable';
      card.innerHTML = `
        <div class="media-poster-wrap">
          <img src="${serie.poster}" class="media-poster">
          <div class="media-badge-quality">${serie.quality}</div>
          <div class="media-score-badge">★ ${serie.score}</div>
        </div>
        <div class="media-info">
          <div class="media-title">${serie.title}</div>
          <div class="media-submeta"><span>${serie.year}</span><span>${serie.seasons ? serie.seasons.length : 1} Temp.</span></div>
        </div>
      `;
      card.addEventListener('click', () => {
        VodModule.openSeriesDetails(serie);
      });
      container.appendChild(card);
    });
  },

  renderPopularChannels() {
    const container = document.getElementById('carousel-popular-channels');
    if (!container) return;
    container.innerHTML = '';

    this.allChannels.slice(0, 8).forEach(ch => {
      const card = document.createElement('div');
      card.className = 'channel-card tv-focusable';
      card.innerHTML = `
        <div class="channel-card-top">
          <img src="${ch.logo}" class="channel-logo-img">
          <div class="channel-meta-info">
            <span class="channel-number-tag">CANAL ${ch.number}</span>
            <div class="channel-name">${ch.name}</div>
          </div>
        </div>
        <div class="channel-card-epg">
          <div class="epg-live-indicator"><div class="epg-dot"></div><span>ESTÁVEL</span></div>
          <div class="epg-show-title">${ch.currentShow ? ch.currentShow.title : 'Programação'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        Player.playItem(ch, 'live', this.allChannels);
      });
      container.appendChild(card);
    });
  },

  // --- MINHA LISTA / FAVORITOS & HISTÓRICO ---
  renderMyListPage() {
    const favs = Storage.getFavorites();
    const history = Storage.getHistory();

    const favChannelsList = this.allChannels.filter(c => favs.channels.includes(c.id));
    const favMoviesList = this.allMovies.filter(m => favs.movies.includes(m.id));

    const chGrid = document.getElementById('mylist-channels-grid');
    const mvGrid = document.getElementById('mylist-movies-grid');
    const histGrid = document.getElementById('mylist-history-grid');

    if (chGrid) {
      if (favChannelsList.length === 0) {
        chGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px">Nenhum canal favoritado ainda. Clique na estrela ao lado de qualquer canal para salvá-lo aqui.</div>';
      } else {
        chGrid.innerHTML = '';
        favChannelsList.forEach(ch => {
          const card = document.createElement('div');
          card.className = 'channel-card tv-focusable';
          card.innerHTML = `
            <div class="channel-card-top">
              <img src="${ch.logo}" class="channel-logo-img">
              <div class="channel-meta-info">
                <span class="channel-number-tag">CANAL ${ch.number} • ★ Favorito</span>
                <div class="channel-name">${ch.name}</div>
              </div>
            </div>
            <div class="channel-card-epg">
              <div class="epg-show-title">${ch.currentShow ? ch.currentShow.title : 'Ao Vivo'}</div>
            </div>
          `;
          card.addEventListener('click', () => Player.playItem(ch, 'live', this.allChannels));
          chGrid.appendChild(card);
        });
      }
    }

    if (mvGrid) {
      if (favMoviesList.length === 0) {
        mvGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px">Nenhum filme ou série favoritado ainda.</div>';
      } else {
        mvGrid.innerHTML = '';
        favMoviesList.forEach(m => {
          const card = document.createElement('div');
          card.className = 'media-card tv-focusable';
          card.innerHTML = `
            <div class="media-poster-wrap"><img src="${m.poster}" class="media-poster"></div>
            <div class="media-info"><div class="media-title">${m.title}</div></div>
          `;
          card.addEventListener('click', () => VodModule.openMovieDetails(m));
          mvGrid.appendChild(card);
        });
      }
    }

    if (histGrid) {
      if (history.length === 0) {
        histGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px">Histórico de reprodução vazio.</div>';
      } else {
        histGrid.innerHTML = '';
        history.forEach(item => {
          const card = document.createElement('div');
          card.className = 'media-card tv-focusable';
          card.innerHTML = `
            <div class="media-poster-wrap">
              <img src="${item.poster}" class="media-poster">
              <div style="position:absolute; bottom:0; left:0; right:0; height:6px; background:rgba(255,255,255,0.2)">
                <div style="height:100%; width:${item.progressPercent}%; background:var(--gold-gradient)"></div>
              </div>
            </div>
            <div class="media-info">
              <div class="media-title">${item.title}</div>
              <div style="font-size:0.75rem; color:var(--champagne)">${item.progressPercent}% assistido</div>
            </div>
          `;
          histGrid.appendChild(card);
        });
      }
    }

    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      Storage.clearHistory();
      this.renderMyListPage();
      this.showToast('Histórico de reprodução limpo.');
    });
  },

  // --- CONFIGURAÇÕES & GUIA ---
  renderSettingsPage() {
    const settings = Storage.getSettings();

    const bufferSelect = document.getElementById('setting-buffer-size');
    if (bufferSelect) {
      bufferSelect.value = settings.bufferSize || '15';
      bufferSelect.onchange = (e) => {
        Storage.saveSettings({ bufferSize: e.target.value });
        this.showToast(`Buffer configurado para ${e.target.value} segundos`);
      };
    }

    const tvSwitch = document.getElementById('setting-tv-mode');
    if (tvSwitch) {
      tvSwitch.checked = document.body.classList.contains('tv-mode-active');
      tvSwitch.onchange = (e) => {
        Remote.enableTvMode(e.target.checked);
      };
    }
  },

  // --- MODAL UTILITIES ---
  openModal(htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    const windowEl = document.querySelector('.modal-window');
    if (overlay && windowEl) {
      windowEl.innerHTML = `<button class="modal-close-btn tv-focusable" id="btn-close-modal">✕</button>` + htmlContent;
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        this.closeModal();
      });

      setTimeout(() => {
        const firstFocus = windowEl.querySelector('.tv-focusable');
        if (firstFocus) Remote.setFocus(firstFocus);
      }, 100);
    }
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => Remote.focusFirstAvailable(), 100);
    }
  },

  openFreeTrialModal() {
    const content = `
      <div style="padding: 32px">
        <span class="badge-tag">⚡ Acesso Imediato</span>
        <h2 style="font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 8px">Teste IPTV Grátis de 6 Horas</h2>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px">
          Acesso completo liberado em menos de 2 minutos para <strong>todos os 18.000 canais ao vivo</strong> e <strong>50.000 filmes e séries em 4K HDR</strong>. Sem cartão de crédito, sem fidelidade e sem cobrança automática.
        </p>

        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; margin-bottom:24px">
          <div style="font-weight:700; color:var(--champagne); margin-bottom:8px">O que você recebe no teste:</div>
          <ul style="list-style:none; font-size:0.88rem; color:var(--text-main); display:flex; flex-direction:column; gap:6px">
            <li>✅ Todos os canais Premiere FC e SporTV 1/2/3</li>
            <li>✅ Champions League, ESPN e BandSports</li>
            <li>✅ Filmes lançamentos em 4K HDR e áudio 5.1</li>
            <li>✅ HBO, Séries completas e novelas</li>
            <li>✅ Servidores dedicados sem travar</li>
          </ul>
        </div>

        <div style="display:flex; justify-content:center; gap:16px">
          <a href="https://plataoplomo.com.br/teste-iptv/" target="_blank" class="btn-gold tv-focusable" style="padding:12px 28px; font-size:1rem">
            💬 Liberar Meu Teste de 6 Horas Agora
          </a>
        </div>
      </div>
    `;
    this.openModal(content);
  },

  // --- TOAST NOTIFICATIONS ---
  showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<span>👑</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Auto start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
