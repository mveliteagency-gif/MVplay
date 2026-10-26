// ========================================================
// PLATAOPLOMO TV — ADVANCED OTT VIDEO PLAYER (HLS & MP4)
// Features: Auto recovery, buffer management, channel surfing,
// OSD auto-hide, remote control shortcuts, EPG guide overlay.
// ========================================================

const Player = {
  hls: null,
  videoEl: null,
  containerEl: null,
  currentItem: null,
  currentType: 'live', // 'live' | 'vod'
  osdTimer: null,
  retryCount: 0,
  maxRetries: 3,
  qualities: [],
  channelsList: [],

  init() {
    this.videoEl = document.getElementById('main-video');
    this.containerEl = document.getElementById('player-view-container');
    this.bindEvents();
  },

  isOpen() {
    return this.containerEl && this.containerEl.classList.contains('active');
  },

  playItem(item, type = 'live', channelList = []) {
    this.currentItem = item;
    this.currentType = type;
    this.channelsList = channelList;
    this.retryCount = 0;

    // Open player view
    this.containerEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update Top OSD Title & Badges
    document.getElementById('player-media-title').textContent = item.name || item.title;
    document.getElementById('player-media-subtitle').textContent = 
      type === 'live' ? (item.currentShow ? item.currentShow.title : 'Ao Vivo') : (item.year ? `${item.year} • ${item.duration || ''}` : '');
    
    const logoEl = document.getElementById('player-channel-logo');
    if (item.logo || item.poster) {
      logoEl.src = item.logo || item.poster;
      logoEl.style.display = 'block';
    } else {
      logoEl.style.display = 'none';
    }

    // Toggle VOD Timeline vs Live Badge
    const liveTag = document.getElementById('player-live-badge');
    const timelineWrap = document.getElementById('player-timeline-wrap');

    if (type === 'live') {
      liveTag.style.display = 'inline-block';
      timelineWrap.style.display = 'none';
    } else {
      liveTag.style.display = 'none';
      timelineWrap.style.display = 'flex';
    }

    // Setup Channel Surfing Overlay if Live
    this.setupChannelSurfingList();

    // Start playback
    this.loadStream(item.streamUrl || item.backupStreamUrl);

    // Show OSD and start inactivity timer
    this.showOsd();

    // Give focus to play/pause button for TV
    setTimeout(() => {
      const playBtn = document.getElementById('btn-player-play');
      if (playBtn) Remote.setFocus(playBtn);
    }, 200);
  },

  loadStream(url) {
    if (!url) {
      this.showError('URL de vídeo não configurada para este conteúdo.');
      return;
    }

    this.showBuffering(true);
    this.hideError();

    // Destroy previous HLS instance if any
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    const isHls = url.includes('.m3u8') || url.includes('hls');

    if (isHls && window.Hls && Hls.isSupported()) {
      const settings = Storage.getSettings();
      const bufferSeconds = parseInt(settings.bufferSize) || 15;

      this.hls = new Hls({
        maxBufferLength: bufferSeconds,
        maxMaxBufferLength: bufferSeconds * 2,
        liveSyncDurationCount: 3,
        enableWorker: true
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoEl);

      this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        this.qualities = data.levels;
        this.populateQualityMenu(data.levels);
        this.videoEl.play().catch(e => console.log('Autoplay blocked:', e));
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, attempting recovery...');
              if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.hls.startLoad();
              } else if (this.currentItem.backupStreamUrl) {
                console.log('Switching to backup stream...');
                this.loadStream(this.currentItem.backupStreamUrl);
              } else {
                this.showError('Falha temporária na fonte de transmissão. Tentando reconectar...');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, recovering media...');
              this.hls.recoverMediaError();
              break;
            default:
              this.hls.destroy();
              this.showError('Não foi possível decodificar o vídeo desta fonte.');
              break;
          }
        }
      });
    } else {
      // Direct MP4 or Native HLS (Safari / Smart TV webOS)
      this.videoEl.src = url;
      this.videoEl.play().catch(e => console.log('Autoplay fallback:', e));
    }
  },

  populateQualityMenu(levels) {
    const select = document.getElementById('player-quality-select');
    if (!select) return;
    select.innerHTML = '<option value="-1">Auto (Adaptativo)</option>';
    levels.forEach((lvl, i) => {
      const label = `${lvl.height}p (${Math.round(lvl.bitrate / 1000)}k)`;
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = label;
      select.appendChild(opt);
    });
  },

  setQuality(levelIndex) {
    if (this.hls) {
      this.hls.currentLevel = parseInt(levelIndex);
      App.showToast(levelIndex === -1 ? 'Qualidade: Automática' : `Qualidade fixada em nível ${levelIndex}`);
    }
  },

  togglePlay() {
    if (!this.videoEl) return;
    if (this.videoEl.paused) {
      this.videoEl.play();
      this.updatePlayIcon(true);
    } else {
      this.videoEl.pause();
      this.updatePlayIcon(false);
    }
  },

  updatePlayIcon(isPlaying) {
    const btn = document.getElementById('btn-player-play');
    if (btn) {
      btn.innerHTML = isPlaying ? '⏸' : '▶';
    }
  },

  seek(deltaSeconds) {
    if (!this.videoEl || this.currentType === 'live') return;
    this.videoEl.currentTime = Math.max(0, Math.min(this.videoEl.duration, this.videoEl.currentTime + deltaSeconds));
    this.showOsd();
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.containerEl.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  },

  cycleAspectRatio() {
    const video = this.videoEl;
    if (video.classList.contains('aspect-fill')) {
      video.classList.remove('aspect-fill');
      video.classList.add('aspect-cover');
      App.showToast('Proporção: Preencher Tela (Zoom)');
    } else if (video.classList.contains('aspect-cover')) {
      video.classList.remove('aspect-cover');
      App.showToast('Proporção: Original (16:9)');
    } else {
      video.classList.add('aspect-fill');
      App.showToast('Proporção: Esticar (Fill)');
    }
  },

  showBuffering(state) {
    const overlay = document.getElementById('player-buffering-overlay');
    if (overlay) {
      if (state) overlay.classList.add('active');
      else overlay.classList.remove('active');
    }
  },

  showError(msg) {
    this.showBuffering(false);
    const errOverlay = document.getElementById('player-error-overlay');
    const errDesc = document.getElementById('player-error-desc');
    if (errOverlay && errDesc) {
      errDesc.textContent = msg;
      errOverlay.classList.add('active');
    }
  },

  hideError() {
    const errOverlay = document.getElementById('player-error-overlay');
    if (errOverlay) errOverlay.classList.remove('active');
  },

  showOsd() {
    const top = document.querySelector('.player-top-osd');
    const bottom = document.querySelector('.player-bottom-osd');
    if (top) top.classList.remove('hidden');
    if (bottom) bottom.classList.remove('hidden');

    clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(() => {
      if (!this.videoEl.paused) {
        if (top) top.classList.add('hidden');
        if (bottom) bottom.classList.add('hidden');
      }
    }, 4500);
  },

  toggleChannelOverlay() {
    const overlay = document.getElementById('player-channel-overlay');
    if (overlay) {
      overlay.classList.toggle('active');
      if (overlay.classList.contains('active')) {
        const first = overlay.querySelector('.channel-overlay-item');
        if (first) Remote.setFocus(first);
      }
    }
  },

  toggleEpgGuide() {
    const bar = document.getElementById('player-epg-guide-bar');
    if (bar) {
      bar.classList.toggle('active');
      if (bar.classList.contains('active')) {
        setTimeout(() => bar.classList.remove('active'), 6000);
      }
    }
  },

  setupChannelSurfingList() {
    const listEl = document.getElementById('channel-overlay-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!this.channelsList || this.channelsList.length === 0) return;

    this.channelsList.forEach((ch) => {
      const item = document.createElement('div');
      item.className = `channel-overlay-item tv-focusable ${this.currentItem.id === ch.id ? 'active' : ''}`;
      item.innerHTML = `
        <img src="${ch.logo}" class="channel-logo-img" style="width:36px;height:36px">
        <div style="flex:1;overflow:hidden">
          <div style="font-size:0.88rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ch.name}</div>
          <div style="font-size:0.75rem;color:var(--champagne)">${ch.currentShow ? ch.currentShow.title : ch.category}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        this.playItem(ch, 'live', this.channelsList);
        document.getElementById('player-channel-overlay').classList.remove('active');
      });
      listEl.appendChild(item);
    });
  },

  close() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
    }
    this.containerEl.classList.remove('active');
    document.body.style.overflow = '';
    clearTimeout(this.osdTimer);

    // Save history progress if VOD
    if (this.currentItem && this.currentType === 'vod' && this.videoEl.duration > 0) {
      Storage.saveProgress(this.currentItem, this.videoEl.currentTime, this.videoEl.duration);
    }

    // Return focus to page
    setTimeout(() => {
      Remote.focusFirstAvailable();
    }, 100);
  },

  bindEvents() {
    const v = this.videoEl;
    if (!v) return;

    v.addEventListener('waiting', () => this.showBuffering(true));
    v.addEventListener('playing', () => {
      this.showBuffering(false);
      this.updatePlayIcon(true);
    });
    v.addEventListener('pause', () => this.updatePlayIcon(false));
    v.addEventListener('timeupdate', () => {
      if (this.currentType === 'vod' && v.duration > 0) {
        const percent = (v.currentTime / v.duration) * 100;
        document.getElementById('player-seek-progress').style.width = `${percent}%`;
        document.getElementById('time-current').textContent = this.formatTime(v.currentTime);
        document.getElementById('time-total').textContent = this.formatTime(v.duration);
      }
    });

    // Mouse move to show OSD
    this.containerEl.addEventListener('mousemove', () => this.showOsd());
    this.containerEl.addEventListener('click', (e) => {
      if (e.target === this.videoEl) {
        this.togglePlay();
      }
      this.showOsd();
    });

    // Player action buttons
    document.getElementById('btn-player-back')?.addEventListener('click', () => this.close());
    document.getElementById('btn-player-play')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-player-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('btn-player-aspect')?.addEventListener('click', () => this.cycleAspectRatio());
    document.getElementById('btn-player-channels')?.addEventListener('click', () => this.toggleChannelOverlay());
    document.getElementById('btn-close-channel-overlay')?.addEventListener('click', () => this.toggleChannelOverlay());
    document.getElementById('btn-retry-stream')?.addEventListener('click', () => {
      this.retryCount = 0;
      this.loadStream(this.currentItem.streamUrl);
    });

    // Timeline seek
    const seekBar = document.getElementById('player-seek-bar');
    if (seekBar) {
      seekBar.addEventListener('click', (e) => {
        if (this.currentType === 'vod' && v.duration > 0) {
          const rect = seekBar.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          v.currentTime = pos * v.duration;
        }
      });
    }

    // Quality switcher
    document.getElementById('player-quality-select')?.addEventListener('change', (e) => {
      this.setQuality(e.target.value);
    });
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
};

window.Player = Player;
