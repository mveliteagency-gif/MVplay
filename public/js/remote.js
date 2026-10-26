// ========================================================
// PLATAOPLOMO TV — SPATIAL NAVIGATION & TV REMOTE ENGINE
// Supports: Arrow Keys, Enter, Backspace, Escape, Virtual Remote
// ========================================================

const Remote = {
  currentFocus: null,
  enabled: true,

  init() {
    this.bindKeyboardEvents();
    this.bindVirtualRemoteEvents();

    // Check if TV mode is enabled in settings
    const settings = Storage.getSettings();
    if (settings.tvMode) {
      this.enableTvMode(true);
    }

    // Set initial focus when page renders
    setTimeout(() => {
      this.refreshFocusables();
    }, 300);
  },

  enableTvMode(state) {
    if (state) {
      document.body.classList.add('tv-mode-active', 'tv-ui-scaled');
      const badge = document.getElementById('tv-mode-indicator');
      if (badge) badge.style.display = 'flex';
      this.focusFirstAvailable();
    } else {
      document.body.classList.remove('tv-mode-active', 'tv-ui-scaled');
      const badge = document.getElementById('tv-mode-indicator');
      if (badge) badge.style.display = 'none';
      if (this.currentFocus) {
        this.currentFocus.classList.remove('tv-focused');
      }
    }
    Storage.saveSettings({ tvMode: state });
  },

  toggleTvMode() {
    const isTv = document.body.classList.contains('tv-mode-active');
    this.enableTvMode(!isTv);
    App.showToast(!isTv ? 'Modo TV Ativado: Use as setas do teclado ou o controle' : 'Modo TV Desativado');
  },

  refreshFocusables() {
    const focusables = this.getFocusables();
    if (focusables.length > 0 && !this.currentFocus) {
      this.setFocus(focusables[0]);
    }
  },

  getFocusables() {
    // Only elements visible on screen and not hidden inside closed overlays
    return Array.from(document.querySelectorAll('.tv-focusable')).filter(el => {
      const style = window.getComputedStyle(el);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      return isVisible && el.offsetParent !== null;
    });
  },

  setFocus(el) {
    if (!el) return;
    if (this.currentFocus) {
      this.currentFocus.classList.remove('tv-focused');
    }
    this.currentFocus = el;
    el.classList.add('tv-focused');
    el.focus();

    // Smooth scroll into center view
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  },

  focusFirstAvailable() {
    const list = this.getFocusables();
    if (list.length > 0) {
      this.setFocus(list[0]);
    }
  },

  // SPATIAL NAVIGATION CALCULATOR (Finds geometrically nearest element in direction)
  navigate(direction) {
    if (!this.enabled) return;
    const focusables = this.getFocusables();
    if (focusables.length === 0) return;

    if (!this.currentFocus || !document.body.contains(this.currentFocus)) {
      this.setFocus(focusables[0]);
      return;
    }

    const currentRect = this.currentFocus.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestElement = null;
    let minDistance = Infinity;

    for (const target of focusables) {
      if (target === this.currentFocus) continue;

      const targetRect = target.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      const dx = targetCenter.x - currentCenter.x;
      const dy = targetCenter.y - currentCenter.y;

      let isCandidate = false;

      switch (direction) {
        case 'up':
          isCandidate = dy < -5 && Math.abs(dx) <= Math.abs(dy) * 1.8;
          break;
        case 'down':
          isCandidate = dy > 5 && Math.abs(dx) <= Math.abs(dy) * 1.8;
          break;
        case 'left':
          isCandidate = dx < -5 && Math.abs(dy) <= Math.abs(dx) * 1.8;
          break;
        case 'right':
          isCandidate = dx > 5 && Math.abs(dy) <= Math.abs(dx) * 1.8;
          break;
      }

      if (isCandidate) {
        // Distance with directional priority
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) {
          minDistance = dist;
          bestElement = target;
        }
      }
    }

    if (bestElement) {
      this.setFocus(bestElement);
    }
  },

  select() {
    if (!this.currentFocus) return;
    this.currentFocus.click();
  },

  back() {
    // If player is open, close player
    if (Player.isOpen()) {
      Player.close();
      return;
    }
    // If modal is open, close modal
    const modal = document.querySelector('.modal-overlay.active');
    if (modal) {
      App.closeModal();
      return;
    }
    // Otherwise go to home tab
    App.navigateTo('home');
  },

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      // If typing in input, don't intercept unless Enter or Escape
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
          this.focusFirstAvailable();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.navigate('right');
          break;
        case 'Enter':
          e.preventDefault();
          this.select();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          this.back();
          break;
        case ' ':
          if (Player.isOpen()) {
            e.preventDefault();
            Player.togglePlay();
          }
          break;
        case 'PageUp':
        case 'p':
        case 'P':
          if (Player.isOpen()) {
            e.preventDefault();
            Player.previousChannel();
          }
          break;
        case 'PageDown':
        case 'n':
        case 'N':
          if (Player.isOpen()) {
            e.preventDefault();
            Player.nextChannel();
          }
          break;
        case 'f':
        case 'F':
          if (Player.isOpen()) {
            e.preventDefault();
            Player.toggleFullscreen();
          }
          break;
        case 'i':
        case 'I':
          if (Player.isOpen()) {
            e.preventDefault();
            Player.toggleEpgGuide();
          }
          break;
      }
    });
  },

  bindVirtualRemoteEvents() {
    const toggleBtn = document.getElementById('btn-virtual-remote-toggle');
    const panel = document.getElementById('virtual-remote-panel');
    const closeBtn = document.getElementById('btn-close-remote');

    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
          this.enableTvMode(true);
        }
      });
    }

    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => {
        panel.classList.remove('active');
      });
    }

    // D-Pad Click bindings
    document.getElementById('remote-up')?.addEventListener('click', () => this.navigate('up'));
    document.getElementById('remote-down')?.addEventListener('click', () => this.navigate('down'));
    document.getElementById('remote-left')?.addEventListener('click', () => this.navigate('left'));
    document.getElementById('remote-right')?.addEventListener('click', () => this.navigate('right'));
    document.getElementById('remote-ok')?.addEventListener('click', () => this.select());
    document.getElementById('remote-back')?.addEventListener('click', () => this.back());
    document.getElementById('remote-home')?.addEventListener('click', () => App.navigateTo('home'));
    document.getElementById('remote-playpause')?.addEventListener('click', () => {
      if (Player.isOpen()) Player.togglePlay();
    });
    document.getElementById('remote-info')?.addEventListener('click', () => {
      if (Player.isOpen()) Player.toggleEpgGuide();
    });
    document.getElementById('remote-ch-prev')?.addEventListener('click', () => {
      if (Player.isOpen()) Player.previousChannel();
    });
    document.getElementById('remote-ch-next')?.addEventListener('click', () => {
      if (Player.isOpen()) Player.nextChannel();
    });
  }
};

window.Remote = Remote;
