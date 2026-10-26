// ========================================================
// PLATAOPLOMO TV — GLOBAL SEARCH MODULE
// ========================================================

const SearchModule = {
  debounceTimer: null,

  init() {
    const input = document.getElementById('global-search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.executeSearch(e.target.value.trim());
        }, 250);
      });
    }
  },

  async executeSearch(query) {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    if (!query) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted)">
          <div style="font-size: 3rem; margin-bottom: 12px">🔍</div>
          <h3>Digite o nome de um canal, filme ou série</h3>
          <p>Exemplos: Premiere, Duna, Flamengo, HBO, The Last of Us, Oppenheimer...</p>
        </div>
      `;
      return;
    }

    try {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gold)">
          <div class="stream-spinner" style="margin: 0 auto 16px"></div>
          <div>Buscando em 18.000 canais e 50.000 filmes...</div>
        </div>
      `;

      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      this.renderResults(data, query);
    } catch (err) {
      resultsContainer.innerHTML = `<div style="text-align:center;color:#ff4d4f;padding:40px">Erro ao realizar pesquisa. Tente novamente.</div>`;
    }
  },

  renderResults(data, query) {
    const container = document.getElementById('search-results-container');
    if (!container) return;

    const totalResults = (data.channels.length || 0) + (data.movies.length || 0) + (data.series.length || 0);

    if (totalResults === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted)">
          <div style="font-size: 3rem; margin-bottom: 12px">😕</div>
          <h3>Nenhum resultado para "${query}"</h3>
          <p>Verifique a ortografia ou tente termos mais genéricos.</p>
        </div>
      `;
      return;
    }

    let html = `<div style="margin-bottom:24px; color:var(--champagne); font-weight:700">${totalResults} resultados encontrados para "${query}":</div>`;

    // Channels Section
    if (data.channels && data.channels.length > 0) {
      html += `
        <div style="margin-bottom: 36px">
          <h3 style="color:#fff; font-size:1.2rem; margin-bottom:16px">📺 Canais Ao Vivo (${data.channels.length})</h3>
          <div class="channels-grid">
            ${data.channels.map(ch => `
              <div class="channel-card tv-focusable" data-channel-id="${ch.id}">
                <div class="channel-card-top">
                  <img src="${ch.logo}" class="channel-logo-img">
                  <div class="channel-meta-info">
                    <span class="channel-number-tag">CANAL ${ch.number} • ${ch.quality}</span>
                    <div class="channel-name">${ch.name}</div>
                  </div>
                </div>
                <div class="channel-card-epg">
                  <div class="epg-live-indicator"><div class="epg-dot"></div><span>AO VIVO</span></div>
                  <div class="epg-show-title">${ch.currentShow ? ch.currentShow.title : 'Programação'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Movies Section
    if (data.movies && data.movies.length > 0) {
      html += `
        <div style="margin-bottom: 36px">
          <h3 style="color:#fff; font-size:1.2rem; margin-bottom:16px">🎬 Filmes (${data.movies.length})</h3>
          <div class="catalog-grid">
            ${data.movies.map(m => `
              <div class="media-card tv-focusable" data-movie-id="${m.id}">
                <div class="media-poster-wrap">
                  <img src="${m.poster}" class="media-poster">
                  <div class="media-badge-quality">${m.quality}</div>
                </div>
                <div class="media-info">
                  <div class="media-title">${m.title}</div>
                  <div class="media-submeta"><span>${m.year}</span><span>${m.duration}</span></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Series Section
    if (data.series && data.series.length > 0) {
      html += `
        <div style="margin-bottom: 36px">
          <h3 style="color:#fff; font-size:1.2rem; margin-bottom:16px">📺 Séries (${data.series.length})</h3>
          <div class="catalog-grid">
            ${data.series.map(s => `
              <div class="media-card tv-focusable" data-series-id="${s.id}">
                <div class="media-poster-wrap">
                  <img src="${s.poster}" class="media-poster">
                  <div class="media-badge-quality">${s.quality}</div>
                </div>
                <div class="media-info">
                  <div class="media-title">${s.title}</div>
                  <div class="media-submeta"><span>${s.year}</span><span>${s.seasons ? s.seasons.length : 1} Temp.</span></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click events to results
    container.querySelectorAll('[data-channel-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.channelId;
        const channel = data.channels.find(c => c.id === id);
        if (channel) Player.playItem(channel, 'live', data.channels);
      });
    });

    container.querySelectorAll('[data-movie-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.movieId;
        const movie = data.movies.find(m => m.id === id);
        if (movie) VodModule.openMovieDetails(movie);
      });
    });

    container.querySelectorAll('[data-series-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.seriesId;
        const serie = data.series.find(s => s.id === id);
        if (serie) VodModule.openSeriesDetails(serie);
      });
    });
  }
};

window.SearchModule = SearchModule;
