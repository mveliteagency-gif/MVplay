// ========================================================
// PLATAOPLOMO TV — VOD MODULE (MOVIES & SERIES)
// ========================================================

const VodModule = {
  movies: [],
  series: [],
  movieCategories: [],
  seriesCategories: [],
  currentMovieCat: 'all',
  currentSeriesCat: 'all',

  async init() {
    await this.loadData();
    this.renderMovieCategories();
    this.renderMovies();
    this.renderSeriesCategories();
    this.renderSeries();
  },

  async loadData() {
    try {
      const [catsRes, moviesRes, seriesRes] = await Promise.all([
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/movies').then(r => r.json()),
        fetch('/api/series').then(r => r.json())
      ]);
      this.movieCategories = catsRes.movies || [];
      this.seriesCategories = catsRes.series || [];
      this.movies = moviesRes || [];
      this.series = seriesRes || [];
    } catch (err) {
      console.error('Error loading VOD data:', err);
    }
  },

  // --- MOVIES ---
  renderMovieCategories() {
    const bar = document.getElementById('movies-categories-bar');
    if (!bar) return;
    bar.innerHTML = '';

    this.movieCategories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `category-pill tv-focusable ${this.currentMovieCat === cat.id ? 'active' : ''}`;
      pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
      pill.addEventListener('click', () => {
        this.currentMovieCat = cat.id;
        document.querySelectorAll('#movies-categories-bar .category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderMovies();
      });
      bar.appendChild(pill);
    });
  },

  renderMovies() {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = this.movies;
    if (this.currentMovieCat !== 'all') {
      filtered = filtered.filter(m => m.category === this.currentMovieCat || (m.genres && m.genres.some(g => g.toLowerCase().includes(this.currentMovieCat.toLowerCase()))));
    }

    filtered.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'media-card tv-focusable';
      card.innerHTML = `
        <div class="media-poster-wrap">
          <img src="${movie.poster}" alt="${movie.title}" class="media-poster" loading="lazy">
          <div class="media-badge-quality">${movie.quality}</div>
          <div class="media-score-badge">★ ${movie.score}</div>
        </div>
        <div class="media-info">
          <div class="media-title">${movie.title}</div>
          <div class="media-submeta">
            <span>${movie.year}</span>
            <span>${movie.duration}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.openMovieDetails(movie);
      });

      grid.appendChild(card);
    });
  },

  openMovieDetails(movie) {
    const isFav = Storage.isFavorite('movies', movie.id);
    const content = `
      <div style="position:relative; width:100%; height:280px; overflow:hidden">
        <img src="${movie.backdrop}" style="width:100%; height:100%; object-fit:cover">
        <div style="position:absolute; inset:0; background:linear-gradient(0deg, var(--bg-card) 10%, transparent 100%)"></div>
      </div>
      <div style="padding: 24px; position:relative; margin-top:-60px">
        <div style="display:flex; gap:20px; align-items:flex-start">
          <img src="${movie.poster}" style="width:140px; border-radius:var(--radius-sm); border:2px solid var(--gold); box-shadow:0 10px 25px rgba(0,0,0,0.8)">
          <div style="flex:1">
            <span class="badge-tag">Filme em 4K HDR</span>
            <h2 style="font-size:2rem; font-weight:800; color:#fff; margin-bottom:8px">${movie.title}</h2>
            <div style="display:flex; gap:12px; font-size:0.85rem; color:var(--champagne); font-weight:600; margin-bottom:14px">
              <span>★ ${movie.score}</span>
              <span>•</span>
              <span>${movie.year}</span>
              <span>•</span>
              <span>${movie.duration}</span>
              <span>•</span>
              <span>Classificação ${movie.rating}</span>
            </div>
            <div style="display:flex; gap:12px; margin-bottom:16px">
              <button id="modal-btn-play" class="btn-gold tv-focusable">
                <span>▶ Assistir Agora</span>
              </button>
              <button id="modal-btn-fav" class="btn-secondary tv-focusable">
                <span>${isFav ? '★ Remover dos Favoritos' : '☆ Adicionar aos Favoritos'}</span>
              </button>
            </div>
          </div>
        </div>

        <div style="margin-top:20px">
          <h4 style="color:var(--gold); font-size:1rem; margin-bottom:6px">Sinopse</h4>
          <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6">${movie.synopsis}</p>
        </div>

        <div style="margin-top:16px; font-size:0.85rem; color:var(--text-dim)">
          <div><strong style="color:var(--text-muted)">Direção:</strong> ${movie.director || 'N/A'}</div>
          <div><strong style="color:var(--text-muted)">Elenco:</strong> ${movie.cast ? movie.cast.join(', ') : 'N/A'}</div>
          <div><strong style="color:var(--text-muted)">Áudio:</strong> ${movie.audio} • ${movie.language}</div>
        </div>
      </div>
    `;

    App.openModal(content);

    // Setup action buttons inside modal
    document.getElementById('modal-btn-play')?.addEventListener('click', () => {
      App.closeModal();
      Player.playItem(movie, 'vod');
    });

    document.getElementById('modal-btn-fav')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('movies', movie.id);
      const btn = document.getElementById('modal-btn-fav');
      btn.innerHTML = `<span>${added ? '★ Remover dos Favoritos' : '☆ Adicionar aos Favoritos'}</span>`;
      App.showToast(added ? `${movie.title} salvo nos favoritos` : `${movie.title} removido dos favoritos`);
    });
  },

  // --- SERIES ---
  renderSeriesCategories() {
    const bar = document.getElementById('series-categories-bar');
    if (!bar) return;
    bar.innerHTML = '';

    this.seriesCategories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `category-pill tv-focusable ${this.currentSeriesCat === cat.id ? 'active' : ''}`;
      pill.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
      pill.addEventListener('click', () => {
        this.currentSeriesCat = cat.id;
        document.querySelectorAll('#series-categories-bar .category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderSeries();
      });
      bar.appendChild(pill);
    });
  },

  renderSeries() {
    const grid = document.getElementById('series-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = this.series;
    if (this.currentSeriesCat !== 'all') {
      filtered = filtered.filter(s => s.category === this.currentSeriesCat || (s.genres && s.genres.some(g => g.toLowerCase().includes(this.currentSeriesCat.toLowerCase()))));
    }

    filtered.forEach(serie => {
      const card = document.createElement('div');
      card.className = 'media-card tv-focusable';
      card.innerHTML = `
        <div class="media-poster-wrap">
          <img src="${serie.poster}" alt="${serie.title}" class="media-poster" loading="lazy">
          <div class="media-badge-quality">${serie.quality}</div>
          <div class="media-score-badge">★ ${serie.score}</div>
        </div>
        <div class="media-info">
          <div class="media-title">${serie.title}</div>
          <div class="media-submeta">
            <span>${serie.year}</span>
            <span>${serie.seasons ? serie.seasons.length : 1} Temporadas</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.openSeriesDetails(serie);
      });

      grid.appendChild(card);
    });
  },

  openSeriesDetails(serie) {
    let activeSeasonIndex = 0;

    const renderModalBody = () => {
      const currentSeason = serie.seasons[activeSeasonIndex] || { episodes: [] };

      return `
        <div style="position:relative; width:100%; height:260px; overflow:hidden">
          <img src="${serie.backdrop}" style="width:100%; height:100%; object-fit:cover">
          <div style="position:absolute; inset:0; background:linear-gradient(0deg, var(--bg-card) 10%, transparent 100%)"></div>
        </div>
        <div style="padding: 24px; position:relative; margin-top:-50px">
          <div style="display:flex; gap:20px; align-items:flex-start">
            <img src="${serie.poster}" style="width:130px; border-radius:var(--radius-sm); border:2px solid var(--gold); box-shadow:0 10px 25px rgba(0,0,0,0.8)">
            <div style="flex:1">
              <span class="badge-tag">Série Premiada</span>
              <h2 style="font-size:1.8rem; font-weight:800; color:#fff; margin-bottom:8px">${serie.title}</h2>
              <div style="display:flex; gap:12px; font-size:0.85rem; color:var(--champagne); font-weight:600; margin-bottom:12px">
                <span>★ ${serie.score}</span>
                <span>•</span>
                <span>${serie.year}</span>
                <span>•</span>
                <span>${serie.seasons.length} Temporadas</span>
              </div>
              <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.5">${serie.synopsis}</p>
            </div>
          </div>

          <!-- SEASONS TABS -->
          <div style="display:flex; gap:10px; margin: 24px 0 16px; border-bottom:1px solid var(--border); padding-bottom:12px">
            ${serie.seasons.map((s, idx) => `
              <button class="season-tab-btn tv-focusable ${idx === activeSeasonIndex ? 'btn-gold' : 'btn-secondary'}" data-index="${idx}" style="padding:6px 14px; font-size:0.85rem">
                ${s.name}
              </button>
            `).join('')}
          </div>

          <!-- EPISODES LIST -->
          <div style="display:flex; flex-direction:column; gap:12px">
            ${currentSeason.episodes.map(ep => `
              <div class="episode-row-card tv-focusable" data-stream="${ep.streamUrl}" data-title="${serie.title} - ${ep.title}" style="display:flex; gap:14px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px; cursor:pointer; align-items:center">
                <div style="position:relative; width:120px; aspect-ratio:16/9; overflow:hidden; border-radius:4px; flex-shrink:0">
                  <img src="${ep.thumbnail || serie.poster}" style="width:100%; height:100%; object-fit:cover">
                  <div style="position:absolute; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem">▶</div>
                </div>
                <div style="flex:1">
                  <div style="font-weight:700; color:#fff; font-size:0.95rem">Episódio ${ep.episodeNumber}: ${ep.title}</div>
                  <div style="font-size:0.8rem; color:var(--champagne); margin-bottom:4px">${ep.duration}</div>
                  <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.4">${ep.synopsis}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    const attachModalEvents = () => {
      document.querySelectorAll('.season-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeSeasonIndex = parseInt(btn.dataset.index);
          const modalWindow = document.querySelector('.modal-window');
          if (modalWindow) {
            modalWindow.innerHTML = `<button class="modal-close-btn tv-focusable" id="btn-close-modal">✕</button>` + renderModalBody();
            document.getElementById('btn-close-modal')?.addEventListener('click', () => App.closeModal());
            attachModalEvents();
          }
        });
      });

      document.querySelectorAll('.episode-row-card').forEach(row => {
        row.addEventListener('click', () => {
          App.closeModal();
          Player.playItem({
            title: row.dataset.title,
            streamUrl: row.dataset.stream,
            poster: serie.poster,
            year: serie.year
          }, 'vod');
        });
      });
    };

    App.openModal(renderModalBody());
    attachModalEvents();
  }
};

window.VodModule = VodModule;
