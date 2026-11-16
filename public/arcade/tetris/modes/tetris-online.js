/**
 * TetrisOnline — Módulo Desacoplado de Tetris 1v1 Online y 1v1 vs CPU
 * 
 * Reglas de optimización:
 * - En PC (Desktop):
 *   Transmite la matriz completa para que ambos jugadores vean el tablero del otro en tiempo real (Dual Board).
 * - En Teléfono (Móvil):
 *   NO se envía la matriz pesada del rival. Solo se transmiten paquetes diminutos (< 20 bytes)
 *   con la puntuación y las líneas completadas para máxima ligereza y cero lag.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TetrisOnlineManager = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let ws = null;
  let mySeat = 0;
  let opponentScore = 0;
  let opponentLines = 0;
  let opponentName = 'Rival';
  let mode = 'solo'; // 'solo', '1v1_cpu', '1v1_online'
  let cpuInterval = null;

  let reconnectUI = null;
  let matchStartTime = 0;

  function initUI() {
    // Iniciar UI de reconexión universal compartida
    if (window.ArcadeReconnectUI && !reconnectUI) {
      reconnectUI = new window.ArcadeReconnectUI({
        gameName: 'Tetris',
        onStateChange: (paused) => {
          // Bloquear o reanudar el bucle de caída de tetris mientras está en pausa
          window.isTetrisOnlinePaused = paused;
        }
      });
    }

    // Inyectar tarjeta ligera de rival si estamos en móvil
    let mobRivalCard = document.getElementById('mob-rival-score-card');
    if (!mobRivalCard) {
      mobRivalCard = document.createElement('div');
      mobRivalCard.id = 'mob-rival-score-card';
      mobRivalCard.style.cssText = 'display:none;position:fixed;top:10px;right:10px;background:rgba(18,19,26,0.85);backdrop-filter:blur(8px);border:1px solid rgba(96,165,250,0.5);border-radius:12px;padding:6px 12px;color:#fff;z-index:99;font-family:system-ui,sans-serif;text-align:right;box-shadow:0 4px 15px rgba(0,0,0,0.5);';
      mobRivalCard.innerHTML = `
        <small style="color:#60a5fa;font-size:10px;font-weight:800;text-transform:uppercase;display:block;" id="mob-rival-name">⚡ Rival</small>
        <b style="font-size:16px;color:#fff;" id="mob-rival-score">0 pts</b>
        <small style="font-size:10px;color:#9ca3af;display:block;" id="mob-rival-lines">0 líneas</small>
      `;
      document.body.appendChild(mobRivalCard);
    }
  }

  function connect(roomId) {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }

    const effectiveRoom = roomId || 'global_tetris_1v1';
    const p = new URLSearchParams(window.location.search);
    const uid = p.get('auth') || 't_' + Math.random().toString(36).substring(2, 6);
    const name = p.get('name') || (p.get('uPalette') ? 'Amor Cósmico' : 'Jugador');
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'localhost:8787'
      : window.location.host;

    const wsUrl = `${wsProtocol}//${apiHost}/api/tetris/ws?room=${encodeURIComponent(effectiveRoom)}&uid=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}&device=${deviceType}`;

    console.log('[TetrisOnline] Conectando a:', wsUrl, 'Dispositivo:', deviceType);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[TetrisOnline] WebSocket conectado con éxito');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Bienvenida
        if (data.t === 'welcome') {
          mySeat = data.seat;
          console.log('[TetrisOnline] Asiento asignado:', mySeat);
          if (data.players && data.players.length === 2) {
            onBothPlayersReady(data.players);
          } else {
            showWaitingQueue('Buscando Rival...', 'Esperando a que otro jugador se una a la partida (1/2 conectados)...');
          }
        }

        // 2. Jugador se une
        if (data.t === 'player_joined') {
          if (data.players && data.players.length === 2) {
            onBothPlayersReady(data.players);
          }
        }

        // 3. Puntuación del rival (llega tanto a móvil como a PC)
        if (data.t === 'score_update') {
          opponentScore = data.score;
          opponentLines = data.lines;

          // Si es móvil, actualizamos el HUD ligero
          if (isMobile) {
            const scEl = document.getElementById('mob-rival-score');
            const lnEl = document.getElementById('mob-rival-lines');
            if (scEl) scEl.textContent = `${opponentScore} pts`;
            if (lnEl) lnEl.textContent = `${opponentLines} líneas`;
          } else {
            // Si es PC, actualizamos el panel lateral P2
            const p2Sc = document.getElementById('p2-score-val');
            const p2Ln = document.getElementById('p2-lines-val');
            if (p2Sc) p2Sc.textContent = opponentScore;
            if (p2Ln) p2Ln.textContent = `${opponentLines} líneas`;
            const p2Title = document.getElementById('p2-badge-title');
            if (p2Title && opponentName) {
              p2Title.textContent = `⚡ ${opponentName.toUpperCase()}`;
            }
          }
        }

        // 4. Sincronización del tablero del rival (SOLO llega en PC)
        if (data.t === 'board_sync') {
          if (!isMobile && window.TetrisVersus1v1) {
            window.TetrisVersus1v1.renderRemoteBoard(data.grid, data.piece);
          }
        }

        // 5. Basura recibida del rival
        if (data.t === 'receive_garbage') {
          if (window.TetrisOnlineManager.onGarbageReceived) {
            window.TetrisOnlineManager.onGarbageReceived(data.lines);
          }
        }

        // 6. Fin de partida
        if (data.t === 'game_over') {
          if (reconnectUI) reconnectUI.hidePause();
          window.isTetrisOnlinePaused = false;
          const won = data.winnerSeat === mySeat;
          const durationMs = matchStartTime ? (Date.now() - matchStartTime) : 120000;

          const scoreEl = document.getElementById('sc-total');
          const currentLocalScore = scoreEl ? (parseInt(scoreEl.textContent.replace(/\D/g, ''), 10) || 0) : 0;

          if (window.enviarRecompensaTetris) {
            window.enviarRecompensaTetris({
              score: currentLocalScore,
              durationMs: durationMs,
              win: won,
              abandon: !!data.abandon
            });
          }

          if (window.notify) {
            const title = data.abandon
              ? (won ? '¡VICTORIA POR ABANDONO!' : 'DERROTA POR ABANDONO')
              : (won ? '¡VICTORIA ÉPICA!' : 'FIN DEL DUELO');
            const msg = data.abandon
              ? (won ? 'Tu rival no regresó en 5s. Ganas los puntos y monedas.' : 'Tiempo de reconexión expirado.')
              : (won ? 'Has derrotado a tu rival en tiempo real.' : 'Tu rival ha ganado esta partida.');
            window.notify(title, msg, won, 4500);
          }
        }

        // 7. Pausa por desconexión temporal (5s de gracia)
        if (data.t === 'match_paused') {
          if (reconnectUI) reconnectUI.showPause(data.name, data.timeoutSeconds || 5);
          window.isTetrisOnlinePaused = true;
        }

        // 8. Reanudación tras reconexión exitosa
        if (data.t === 'match_resumed') {
          if (reconnectUI) reconnectUI.hidePause();
          window.isTetrisOnlinePaused = false;
        }

        // 9. Rival desconectado fuera de partida
        if (data.t === 'player_left') {
          if (reconnectUI) reconnectUI.hidePause();
          window.isTetrisOnlinePaused = false;
        }

      } catch (e) {
        console.warn('[TetrisOnline] Error parseando mensaje:', e);
      }
    };

    ws.onerror = (e) => console.error('[TetrisOnline] Error WS:', e);
    ws.onclose = () => console.log('[TetrisOnline] Conexión cerrada');
  }

  function showWaitingQueue(title, status) {
    const ov = document.getElementById('ov');
    if (ov) ov.style.display = 'flex';
    const startB = document.getElementById('start');
    if (startB) startB.style.display = 'none';
    const modeOpt = document.getElementById('mode-options');
    if (modeOpt) modeOpt.style.display = 'none';

    const queueBox = document.getElementById('queue-overlay');
    const queueT = document.getElementById('queue-title');
    const queueS = document.getElementById('queue-status');
    const btnCancel = document.getElementById('btn-cancel-queue');

    if (queueBox) queueBox.style.display = 'flex';
    if (queueT) queueT.textContent = title || 'Buscando Rival...';
    if (queueS) queueS.textContent = status || 'Esperando a otro jugador...';

    if (btnCancel) {
      btnCancel.onclick = (e) => {
        e.stopPropagation();
        leaveQueue();
      };
    }
  }

  function hideWaitingQueue() {
    const queueBox = document.getElementById('queue-overlay');
    if (queueBox) queueBox.style.display = 'none';
    const ov = document.getElementById('ov');
    if (ov) ov.style.display = 'none';
  }

  function leaveQueue() {
    if (ws) {
      try { ws.close(); } catch (e) {}
      ws = null;
    }
    hideWaitingQueue();
    const ov = document.getElementById('ov');
    if (ov) ov.style.display = 'flex';
    const startB = document.getElementById('start');
    if (startB) {
      startB.textContent = 'Empezar a Jugar';
      startB.style.display = 'block';
    }
    const modeOpt = document.getElementById('mode-options');
    if (modeOpt) modeOpt.style.display = 'none';
    if (window.notify) {
      window.notify('BÚSQUEDA CANCELADA', 'Has salido de la cola de emparejamiento.', false, 2500);
    }
  }

  function onBothPlayersReady(players) {
    hideWaitingQueue();
    matchStartTime = Date.now();
    const opp = players.find(p => p.seat !== mySeat);
    opponentName = opp ? opp.name : 'Rival';

    // Actualizar título de la tarjeta en desktop
    const p2Title = document.getElementById('p2-badge-title');
    if (p2Title) {
      p2Title.textContent = `⚡ ${opponentName.toUpperCase()}`;
    }
    const p2Label = document.getElementById('p2-name-label');
    if (p2Label) {
      p2Label.textContent = 'En vivo';
    }

    if (isMobile) {
      const card = document.getElementById('mob-rival-score-card');
      const nameEl = document.getElementById('mob-rival-name');
      if (card) card.style.display = 'block';
      if (nameEl) nameEl.textContent = `⚡ Rival: ${opponentName}`;
    }

    if (window.notify) {
      window.notify('¡RIVAL ENCONTRADO!', `${opponentName} se ha unido. ¡Comienza el duelo!`, true, 3000);
    } else {
      console.log(`[TetrisOnline] Rival conectado: ${opponentName}`);
    }

    // Iniciar el bucle de juego si la partida no ha comenzado
    if (typeof window.startTetrisLoop === 'function') {
      window.startTetrisLoop();
    }
  }

  // Enviar puntuación (se llama cada vez que se completan líneas o suma puntos)
  function sendScore(score, lines) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        t: 'score_update',
        score: score,
        lines: lines
      }));
    }
  }

  // Enviar matriz del tablero (SOLO se envía si el jugador está en PC)
  function sendBoard(grid, activePiece) {
    if (isMobile) return; // En móvil no enviamos el tablero para ahorrar datos y batería
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        t: 'board_sync',
        grid: grid,
        piece: activePiece ? { x: activePiece.x, y: activePiece.y, t: activePiece.t, m: activePiece.m } : null
      }));
    }
  }

  // Enviar líneas de basura al rival
  function sendGarbage(lines) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        t: 'send_garbage',
        lines: lines
      }));
    }
  }

  // Modo 1v1 vs CPU Inteligente
  function startCpuMode() {
    mode = '1v1_cpu';
    opponentScore = 0;
    opponentLines = 0;
    opponentName = 'IA Bot';

    if (isMobile) {
      const card = document.getElementById('mob-rival-score-card');
      const nameEl = document.getElementById('mob-rival-name');
      if (card) card.style.display = 'block';
      if (nameEl) nameEl.textContent = '🤖 IA Bot';
    }

    // La CPU simula progreso gradual de puntuación y despeje de líneas
    if (cpuInterval) clearInterval(cpuInterval);
    cpuInterval = setInterval(() => {
      opponentScore += 150 + Math.floor(Math.random() * 200);
      opponentLines += Math.random() > 0.4 ? 1 : 0;

      if (isMobile) {
        const scEl = document.getElementById('mob-rival-score');
        const lnEl = document.getElementById('mob-rival-lines');
        if (scEl) scEl.textContent = `${opponentScore} pts`;
        if (lnEl) lnEl.textContent = `${opponentLines} líneas`;
      } else {
        const p2Sc = document.getElementById('p2-score-val');
        const p2Ln = document.getElementById('p2-lines-val');
        if (p2Sc) p2Sc.textContent = opponentScore;
        if (p2Ln) p2Ln.textContent = `${opponentLines} líneas`;
      }
    }, 3200);
  }

  function stopCpu() {
    if (cpuInterval) clearInterval(cpuInterval);
    cpuInterval = null;
    const card = document.getElementById('mob-rival-score-card');
    if (card) card.style.display = 'none';
  }

  // Inicializar al cargar
  window.addEventListener('DOMContentLoaded', initUI);

  return {
    isMobile: isMobile,
    connect: connect,
    sendScore: sendScore,
    sendBoard: sendBoard,
    sendGarbage: sendGarbage,
    startCpuMode: startCpuMode,
    stopCpu: stopCpu,
    showWaitingQueue: showWaitingQueue,
    leaveQueue: leaveQueue,
    onGarbageReceived: null
  };
});
