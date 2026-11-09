/**
 * arcade-reconnect.js — Gestor Universal de UI y Eventos de Reconexión para Juegos Arcade.
 * 
 * Reutilizable en cualquier frontend de minijuegos (Pool, Tetris, etc.):
 * - Inyecta dinámicamente o controla el banner de pausa con temporizador regresivo.
 * - Sincroniza eventos match_paused y match_resumed.
 * - Avisa al usuario con notificaciones y maneja el estado de bloqueo de controles.
 */

(function (root) {
  class ArcadeReconnectUI {
    constructor(options = {}) {
      this.gameName = options.gameName || 'Arcade';
      this.overlayId = options.overlayId || 'arcadePauseOverlay';
      this.countdownTimer = null;
      this.secondsLeft = 0;
      this.isPaused = false;
      this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;

      this._ensureStyles();
      this._ensureDOM();
    }

    _ensureStyles() {
      if (document.getElementById('arcade-reconnect-styles')) return;
      const style = document.createElement('style');
      style.id = 'arcade-reconnect-styles';
      style.textContent = `
        .arcade-pause-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(4, 7, 16, 0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: arcadeFadeIn 0.2s ease-out;
        }
        .arcade-pause-overlay[hidden] {
          display: none !important;
        }
        .arcade-pause-card {
          background: linear-gradient(145deg, #161a23, #0f1218);
          border: 1px solid rgba(245, 197, 66, 0.4);
          border-radius: 20px;
          padding: 24px 28px;
          max-width: 440px;
          width: 90%;
          text-align: center;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.8), 0 0 24px rgba(245, 197, 66, 0.18);
          user-select: none;
        }
        .arcade-pause-spinner {
          width: 44px;
          height: 44px;
          margin: 0 auto 14px;
          border: 3.5px solid rgba(245, 197, 66, 0.2);
          border-top-color: #f5c542;
          border-radius: 50%;
          animation: arcadeSpin 1s linear infinite;
        }
        .arcade-pause-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #f5c542;
          text-shadow: 0 0 12px rgba(245, 197, 66, 0.4);
        }
        .arcade-pause-sub {
          margin: 0 0 16px;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.4;
        }
        .arcade-pause-timer-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 16px;
          margin-bottom: 12px;
        }
        .arcade-pause-timer-label {
          font-size: 13px;
          color: #94a3b8;
        }
        .arcade-pause-timer-num {
          font-size: 24px;
          font-weight: 900;
          color: #ef4444;
          text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        .arcade-pause-note {
          display: block;
          font-size: 11px;
          color: #64748b;
          line-height: 1.3;
        }
        @keyframes arcadeSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes arcadeFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    _ensureDOM() {
      if (document.getElementById(this.overlayId)) return;
      const overlay = document.createElement('div');
      overlay.id = this.overlayId;
      overlay.className = 'arcade-pause-overlay';
      overlay.hidden = true;
      overlay.innerHTML = `
        <div class="arcade-pause-card">
          <div class="arcade-pause-spinner"></div>
          <h3 class="arcade-pause-title">PARTIDA EN PAUSA</h3>
          <p id="${this.overlayId}-text" class="arcade-pause-sub">Tu rival se ha desconectado. Esperando que regrese...</p>
          <div class="arcade-pause-timer-wrap">
            <span class="arcade-pause-timer-label">Tiempo restante para reconectar:</span>
            <strong id="${this.overlayId}-timer" class="arcade-pause-timer-num">20s</strong>
          </div>
          <small class="arcade-pause-note">Si no regresa en 20 segundos, la partida finalizará otorgándote la victoria.</small>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    /**
     * Activa el estado de pausa con cuenta regresiva.
     */
    showPause(playerName = 'Tu rival', timeoutSeconds = 20) {
      this.isPaused = true;
      this.secondsLeft = timeoutSeconds;

      const overlay = document.getElementById(this.overlayId);
      const text = document.getElementById(`${this.overlayId}-text`);
      const timer = document.getElementById(`${this.overlayId}-timer`);

      if (overlay) overlay.hidden = false;
      if (text) text.textContent = `${playerName} se ha desconectado. Esperando que regrese...`;
      if (timer) timer.textContent = `${this.secondsLeft}s`;

      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = setInterval(() => {
        this.secondsLeft--;
        if (timer) timer.textContent = `${Math.max(0, this.secondsLeft)}s`;
        if (this.secondsLeft <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }, 1000);

      if (this.onStateChange) this.onStateChange(true);
    }

    /**
     * Oculta el banner y reanuda el juego.
     */
    hidePause() {
      this.isPaused = false;
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      const overlay = document.getElementById(this.overlayId);
      if (overlay) overlay.hidden = true;

      if (this.onStateChange) this.onStateChange(false);
    }

    getIsPaused() {
      return this.isPaused;
    }
  }

  root.ArcadeReconnectUI = ArcadeReconnectUI;
})(typeof window !== 'undefined' ? window : this);
