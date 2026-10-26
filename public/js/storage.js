// ========================================================
// PLATAOPLOMO TV — STORAGE & STATE MANAGER
// ========================================================

const Storage = {
  KEYS: {
    FAVORITES: 'plataoplomo_favorites',
    HISTORY: 'plataoplomo_history',
    SETTINGS: 'plataoplomo_settings',
    AUTH: 'plataoplomo_auth'
  },

  // FAVORITES
  getFavorites() {
    try {
      const data = localStorage.getItem(this.KEYS.FAVORITES);
      return data ? JSON.parse(data) : { channels: [], movies: [], series: [] };
    } catch (e) {
      return { channels: [], movies: [], series: [] };
    }
  },

  isFavorite(type, id) {
    const favs = this.getFavorites();
    return favs[type] ? favs[type].includes(id) : false;
  },

  toggleFavorite(type, id) {
    const favs = this.getFavorites();
    if (!favs[type]) favs[type] = [];
    const index = favs[type].indexOf(id);
    if (index > -1) {
      favs[type].splice(index, 1);
    } else {
      favs[type].push(id);
    }
    localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favs));
    return index === -1; // true if added, false if removed
  },

  // WATCH HISTORY & CONTINUE WATCHING
  getHistory() {
    try {
      const data = localStorage.getItem(this.KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveProgress(item, currentTime, duration) {
    if (!item || !duration || duration <= 0) return;
    const history = this.getHistory();
    const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));

    const existingIndex = history.findIndex(h => h.id === item.id);
    const entry = {
      id: item.id,
      type: item.type || 'movie',
      title: item.title || item.name,
      poster: item.poster || item.logo,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progressPercent,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      history.splice(existingIndex, 1);
    }
    history.unshift(entry);
    if (history.length > 30) history.pop();

    localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
  },

  clearHistory() {
    localStorage.removeItem(this.KEYS.HISTORY);
  },

  // SETTINGS
  getSettings() {
    const defaults = {
      tvMode: false,
      bufferSize: '15', // seconds
      qualityPreference: 'auto',
      streamFormat: 'hls'
    };
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    } catch (e) {
      return defaults;
    }
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // AUTH
  getAuthToken() {
    return localStorage.getItem(this.KEYS.AUTH) || '';
  },

  setAuthToken(token) {
    if (token) {
      localStorage.setItem(this.KEYS.AUTH, token);
    } else {
      localStorage.removeItem(this.KEYS.AUTH);
    }
  }
};

window.Storage = Storage;
