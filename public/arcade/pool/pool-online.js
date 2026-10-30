/* #####################################################################
 * POOL 3D — MÓDULO ONLINE, SALAS Y BOT IA (Desacoplado)
 * Maneja WebSocket en tiempo real, telemetría ultraligera del taco,
 * matchmaking y lógica de turnos para CPU / Multijugador.
 * ##################################################################### */

(function () {
  let currentGameMode = '2v2_local'; // '1v1_cpu', '2v2_cpu', '1v1_online', '2v2_online'
  let myPlayerSeat = 0;             // Asiento asignado al usuario en partidas online (0..3)
  let rivalAimData = null;
  let poolWs = null;
  let wsThrottle = 0;
  let shotOwnerSeat = null;   // Asiento de quien hizo el tiro en curso (solo él reporta turn_end)
  let matchStarted = false;

  const isOnline = () => currentGameMode === '1v1_online' || currentGameMode === '2v2_online';
  const is1v1 = () => currentGameMode === '1v1_online' || currentGameMode === '1v1_cpu';

  // Snapshot exacto de las bolas (precisión completa para que la física sea idéntica en ambos clientes)
  function snapshotBalls() {
    return window.B.map(b => ({ i: b.i, x: b.x, y: b.y, in: b.in ? 1 : 0 }));
  }

  function applyBalls(list) {
    if (!Array.isArray(list) || !window.B) return;
    list.forEach(sb => {
      const b = window.B.find(it => it.i === sb.i);
      if (!b) return;
      if (sb.in && !b.in) { b.px = sb.x; b.py = sb.y; b.t = 60; }
      if (!sb.in && b.in) { b.t = 0; }
      b.x = sb.x; b.y = sb.y; b.in = sb.in ? 1 : 0; b.vx = 0; b.vy = 0;
    });
    window.rd.shadowMap.needsUpdate = true;
  }

  function setMsg(text) {
    const m = document.getElementById('msg');
    if (m) m.textContent = text;
  }

  function turnMsg() {
    if (window.isPoolMyTurn()) {
      setMsg(window.hand ? '¡Tu turno! Coloca la blanca y luego tira.' : '¡Tu turno! Apunta y mantén FUERZA.');
    } else {
      setMsg('Turno de ' + window.NAMES[window.turn] + ' · espera su tiro...');
    }
  }

  window.isRivalAiming = function () {
    return (currentGameMode === '1v1_online' || currentGameMode === '2v2_online') && !window.isPoolMyTurn() && rivalAimData != null;
  };

  window.getRivalAimData = function () {
    return rivalAimData;
  };

  // Helper para saber si es mi turno de interactuar
  window.isPoolMyTurn = function () {
    if (currentGameMode === '1v1_cpu') {
      return window.turn === 0; // Humano es Asiento 0 (Rojo)
    }
    if (currentGameMode === '2v2_cpu') {
      return window.turn === 0 || window.turn === 2; // Humano y su pareja son Asientos 0 y 2 (Rojo)
    }
    if (currentGameMode === '1v1_online' || currentGameMode === '2v2_online') {
      return window.turn === myPlayerSeat;
    }
    return true; // En modo local todos los turnos son interactuables
  };

  // 1. TRANSMISIÓN EN VIVO DEL APUNTADO (Emisor hacia WebSocket a 30 Hz)
  window.onPoolAimTransmit = function (a, l) {
    if ((currentGameMode === '1v1_online' || currentGameMode === '2v2_online') && poolWs && poolWs.readyState === WebSocket.OPEN && window.isPoolMyTurn()) {
      const now = performance.now();
      if (now - wsThrottle > 33) { // ~30 FPS para telemetría súper liviana (<30 bytes)
        wsThrottle = now;
        poolWs.send(JSON.stringify({
          t: 'aim',
          yaw: Number(a.toFixed(4)),
          pw: Number((l / 180).toFixed(3))
        }));
      }
    }
  };

  // 2. TRANSMISIÓN DEL DISPARO (incluye snapshot de bolas para que el rival simule exactamente lo mismo)
  window.onPoolShootTransmit = function (a, p) {
    if (isOnline() && poolWs && poolWs.readyState === WebSocket.OPEN && window.isPoolMyTurn()) {
      shotOwnerSeat = myPlayerSeat;
      rivalAimData = null;
      poolWs.send(JSON.stringify({
        t: 'shot',
        vx: window.B[0].vx,
        vy: window.B[0].vy,
        pw: p,
        a: a,
        balls: snapshotBalls()
      }));
    }
  };

  // 3. TRANSMISIÓN DEL FIN DEL TIRO Y DISPARADOR DE CPU
  window.onPoolFinishTransmit = function () {
    // En 1v1 solo existen los asientos 0 y 1 (el motor rota 0..3)
    if (is1v1() && window.turn > 1) {
      window.turn = window.turn % 2;
      window.ui();
    }

    if (isOnline()) {
      // Solo quien disparó es la autoridad del resultado (el turno ya cambió localmente, por eso no usamos isPoolMyTurn)
      if (shotOwnerSeat === myPlayerSeat && poolWs && poolWs.readyState === WebSocket.OPEN) {
        poolWs.send(JSON.stringify({
          t: 'turn_end',
          nextTurn: window.turn,
          pot: window.pot,
          grp: window.grp,
          hand: !!window.hand,
          over: window.over,
          balls: snapshotBalls()
        }));
        shotOwnerSeat = null;
      }
      turnMsg();
      return;
    }

    checkCpuTurn();
  };

  // Arranque sincronizado de la partida para todos los jugadores
  function startMatch() {
    if (matchStarted) return;
    matchStarted = true;
    const spinnerEl = document.getElementById('matchmakingSpinner');
    if (spinnerEl) spinnerEl.hidden = true;
    document.getElementById('modeModal').hidden = true;

    const team = s => (s % 2 ? 'Azul' : 'Rojo');
    const seats = is1v1() ? 2 : 4;
    for (let s = 0; s < seats; s++) {
      window.NAMES[s] = s === myPlayerSeat ? `Tú (${team(s)})` : (is1v1() ? `Rival (${team(s)})` : `${team(s)} ${s < 2 ? 1 : 2}`);
    }

    window.newGame();
    window.turn = 0;
    rivalAimData = null;
    shotOwnerSeat = null;
    window.ui();
    turnMsg();
    const startMsg = myPlayerSeat === 0 ? '¡Es tu turno! Tira el taco para romper.' : 'Turno del rival. Espera su tiro.';
    window.notify('¡PARTIDA LISTA!', startMsg, true, 3000);
  }

  // 4. INTELIGENCIA ARTIFICIAL (BOT CPU)
  function checkCpuTurn() {
    if (window.over != null || window.moving) return;
    const isCpu = (currentGameMode === '1v1_cpu' && window.turn === 1) ||
      (currentGameMode === '2v2_cpu' && (window.turn === 1 || window.turn === 3));
    if (!isCpu) return;

    const M = document.getElementById('msg');
    if (M) M.textContent = '🤖 La IA ' + window.NAMES[window.turn] + ' está calculando su jugada...';

    setTimeout(() => {
      if (window.over != null || window.moving) return;

      if (window.hand) {
        window.startHand();
        window.hand = false;
        window.setMode(true);
      }

      const c = window.B[0];
      const t = window.turn % 2;
      const myGrp = window.grp[t];

      let targetBall = null;
      let minD = 1e9;

      const legalBalls = window.B.filter(b => {
        if (b.i === 0 || b.in) return false;
        if (!myGrp) return b.i !== 8;
        const hasRemaining = window.B.some(other => other.i !== 0 && other.i !== 8 && !other.in && window.own(other.i, t));
        if (hasRemaining) return window.own(b.i, t);
        return b.i === 8;
      });

      const poolTarget = legalBalls.length > 0 ? legalBalls : window.B.filter(b => b.i !== 0 && !b.in);

      for (const b of poolTarget) {
        for (const pk of window.PK) {
          const d = Math.hypot(b.x - pk[0], b.y - pk[1]);
          if (d < minD) {
            minD = d;
            targetBall = b;
          }
        }
      }

      if (!targetBall) targetBall = poolTarget[0] || window.B[1];

      const angleToTarget = Math.atan2(targetBall.y - c.y, targetBall.x - c.x);
      const imperfection = (Math.random() - 0.5) * 0.05;
      const finalAngle = angleToTarget + imperfection;
      const force = 0.55 + Math.random() * 0.35;

      window.setAimYaw(finalAngle);
      window.aim(finalAngle, force * 180);
      window.rd.shadowMap.needsUpdate = true;

      setTimeout(() => {
        if (window.idle()) {
          window.shoot(finalAngle, force);
        }
      }, 700);
    }, 900);
  }

  // 5. GESTOR DE WEBSOCKET ONLINE
  function connectPoolOnline(roomId, mode) {
    if (poolWs) {
      try { poolWs.onclose = null; poolWs.close(); } catch (e) { }
    }
    matchStarted = false;
    shotOwnerSeat = null;
    rivalAimData = null;

    const p = new URLSearchParams(window.location.search);
    // Cada pestaña/sesión tiene su propio id de conexión para que 2 pestañas locales o cuentas no colisionen
    let sessionTabId = sessionStorage.getItem('pool_tab_session_id');
    if (!sessionTabId) {
      sessionTabId = 'tab_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('pool_tab_session_id', sessionTabId);
    }
    const uid = (p.get('auth') ? p.get('auth') + '_' : '') + sessionTabId;
    const name = p.get('name') || (p.get('uPalette') ? 'Amor Cósmico' : 'Jugador ' + sessionTabId.substring(4, 7));

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'localhost:8787'
      : window.location.host;

    const wsUrl = `${wsProtocol}//${apiHost}/api/pool/ws?room=${encodeURIComponent(roomId)}&mode=${mode}&uid=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}`;

    const statusEl = document.getElementById('onlineStatusMsg');
    const spinnerEl = document.getElementById('matchmakingSpinner');
    if (statusEl) statusEl.textContent = 'Conectando a la sala ' + roomId + '...';
    if (spinnerEl) spinnerEl.hidden = false;

    poolWs = new WebSocket(wsUrl);

    poolWs.onopen = () => {
      if (statusEl) statusEl.textContent = '¡Conectado! Esperando contrincantes...';
    };

    poolWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PoolOnline] Mensaje recibido del servidor:', data);

        // A. Bienvenida y asignación de asiento
        if (data.t === 'welcome') {
          myPlayerSeat = data.seat;
          currentGameMode = data.mode === '1v1' ? '1v1_online' : '2v2_online';
          window.NAMES[myPlayerSeat] = 'Tú (' + (myPlayerSeat % 2 ? 'Azul' : 'Rojo') + ')';
          if (data.turn != null) window.turn = data.turn;
          window.ui();

          const reqSeats = currentGameMode === '1v1_online' ? 2 : 4;
          const currentCount = (data.players && data.players.length) || 1;

          if (statusEl) {
            statusEl.textContent = `Asiento ${myPlayerSeat + 1} asignado. Conectados: ${currentCount}/${reqSeats}`;
          }

          if (currentCount >= reqSeats) startMatch();
        }

        // B. Nuevo jugador entra
        if (data.t === 'player_joined') {
          window.notify('JUGADOR CONECTADO', `${data.name} entró como ${window.NAMES[data.seat]}`, false, 2000);
          const reqSeats = currentGameMode === '1v1_online' ? 2 : 4;
          const currentCount = (data.players && data.players.length) || 2;

          if (statusEl) {
            statusEl.textContent = `¡Rival encontrado! Conectados: ${currentCount}/${reqSeats}`;
          }

          if (currentCount >= reqSeats) setTimeout(startMatch, 300);
        }

        // C. TELEMETRÍA EN VIVO (Ver cómo apunta y mide fuerza el rival en tiempo real)
        if (data.t === 'aim') {
          if (data.seat !== myPlayerSeat) {
            rivalAimData = { yaw: data.yaw, pw: data.pw };
            window.setAimYaw(data.yaw);
            const cueL = data.pw * 180;
            window.originalAim(data.yaw, cueL);
            const pf = document.getElementById('pf');
            if (pf) pf.style.height = (cueL / 180 * 100) + '%';
            window.rd.shadowMap.needsUpdate = true;
          }
        }

        // D. Disparo del rival: partir EXACTAMENTE del mismo estado y simular el mismo golpe
        if (data.t === 'shot') {
          if (data.seat !== myPlayerSeat) {
            rivalAimData = null;
            shotOwnerSeat = data.seat;
            const pf = document.getElementById('pf');
            if (pf) pf.style.height = '0%';
            if (data.balls) applyBalls(data.balls);
            if (window.hand) { window.hand = false; window.setMode(true); }
            window.originalShoot(data.a, data.pw);
            if (typeof data.vx === 'number' && typeof data.vy === 'number') {
              window.B[0].vx = data.vx;
              window.B[0].vy = data.vy;
            }
          }
        }

        // E. Fin del tiro: el resultado del tirador es la autoridad
        if (data.t === 'turn_end') {
          if (data.seat === myPlayerSeat) return; // eco de mi propio tiro
          rivalAimData = null;
          shotOwnerSeat = null;
          window.moving = false;
          applyBalls(data.balls);
          if (data.grp) window.grp = data.grp;
          window.turn = data.nextTurn;
          if (data.over != null) window.over = data.over;

          const wantHand = !!data.hand;
          if (wantHand && !window.hand) { window.hand = true; window.startHand(); }
          else if (!wantHand && window.hand) { window.hand = false; window.setMode(true); }

          window.ui();
          window.rd.shadowMap.needsUpdate = true;
          turnMsg();
          if (window.over == null) {
            const isMe = window.isPoolMyTurn();
            window.notify(
              isMe ? '¡TU TURNO!' : 'TURNO DEL RIVAL',
              isMe ? (wantHand ? 'Falta del rival: coloca la blanca donde quieras.' : 'Te toca tirar a ti.') : `Turno de ${window.NAMES[window.turn]}.`,
              isMe,
              2200
            );
          }
        }

        // F. Jugador desconectado
        if (data.t === 'player_left') {
          window.notify('JUGADOR DESCONECTADO', `${data.name} salió de la mesa.`, false, 3000);
        }
      } catch (e) {
        console.warn('[PoolOnline] Error parseando mensaje:', e);
      }
    };

    poolWs.onerror = (err) => {
      console.error('[PoolOnline] Error:', err);
      if (statusEl) statusEl.textContent = 'Error de conexión. Reintentando...';
    };

    poolWs.onclose = (ev) => {
      // Si la sala estaba llena o el socket se cerró antes de iniciar, reintentar con sala nueva
      if (ev && ev.code === 4403) {
        if (statusEl) statusEl.textContent = 'Sala completa. Buscando nueva sala libre...';
        setTimeout(() => {
          connectPoolOnline(`room_auto_${mode}_${Math.floor(Date.now() / 30000)}`, mode);
        }, 1000);
      } else {
        if (statusEl) statusEl.textContent = 'Esperando conexión...';
      }
    };
  }

  // 6. EVENTOS DE LA UI DE MODOS
  window.initPoolModeSelector = function () {
    const modal = document.getElementById('modeModal');
    const onlinePanel = document.getElementById('onlinePanel');
    if (!modal) return;

    // Evitar que mousedown/touchstart dentro del modal active el taco de Three.js en el stage
    const modalCard = modal.querySelector('.modal-card');
    if (modalCard) {
      ['pointerdown', 'mousedown', 'touchstart'].forEach(evtType => {
        modalCard.addEventListener(evtType, (e) => e.stopPropagation());
      });
    }

    const openModes = () => {
      modal.hidden = false;
      if (onlinePanel) onlinePanel.hidden = true;
    };

    const exitToCatalog = () => {
      try {
        window.parent.postMessage({ type: 'EXIT_TO_CATALOG' }, '*');
      } catch (e) {
        console.warn('[Pool] No se pudo enviar EXIT_TO_CATALOG al padre:', e);
      }
    };

    const btnOpen = document.getElementById('btnOpenModes');
    const btnClose = document.getElementById('btnCloseModes');
    if (btnOpen) {
      btnOpen.onclick = (e) => {
        e.stopPropagation();
        openModes();
      };
    }
    if (btnClose) {
      btnClose.onclick = (e) => {
        e.stopPropagation();
        currentGameMode = '2v2_local';
        window.NAMES[0] = 'Rojo 1';
        window.NAMES[1] = 'Azul 1';
        window.NAMES[2] = 'Rojo 2';
        window.NAMES[3] = 'Azul 2';
        modal.hidden = true;
      };
    }

    // Botones de retroceder / salir al catálogo
    const btnExitModal = document.getElementById('btnExitToCatalogModal');
    const btnExitBottom = document.getElementById('btnBackCatalogBottom');
    const btnFloatingExit = document.getElementById('btnFloatingExit');

    if (btnExitModal) btnExitModal.onclick = (e) => { e.stopPropagation(); exitToCatalog(); };
    if (btnExitBottom) btnExitBottom.onclick = (e) => { e.stopPropagation(); exitToCatalog(); };
    if (btnFloatingExit) btnFloatingExit.onclick = (e) => { e.stopPropagation(); exitToCatalog(); };

    const b1Cpu = document.getElementById('btnMode1v1Cpu');
    if (b1Cpu) {
      b1Cpu.onclick = (e) => {
        e.stopPropagation();
        currentGameMode = '1v1_cpu';
        window.NAMES[0] = 'Tú (Rojo)';
        window.NAMES[1] = 'IA Rival (Azul)';
        modal.hidden = true;
        window.newGame();
        window.notify('MODO 1v1 vs CPU', 'Juegas tú contra la IA del sistema.', true, 2500);
      };
    }

    const b2Cpu = document.getElementById('btnMode2v2Cpu');
    if (b2Cpu) {
      b2Cpu.onclick = (e) => {
        e.stopPropagation();
        currentGameMode = '2v2_cpu';
        window.NAMES[0] = 'Tú (Rojo 1)';
        window.NAMES[1] = 'IA Bot 1 (Azul 1)';
        window.NAMES[2] = 'Tu Pareja (Rojo 2)';
        window.NAMES[3] = 'IA Bot 2 (Azul 2)';
        modal.hidden = true;
        window.newGame();
        window.notify('MODO 2v2 EN PAREJA vs CPU', 'Tú y tu pareja juegan contra 2 Bots de IA.', true, 2800);
      };
    }

    const b1Online = document.getElementById('btnMode1v1Online');
    if (b1Online) {
      b1Online.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = false;
        document.getElementById('onlinePanelTitle').textContent = '⚡ 1v1 Online';
        document.getElementById('roomCodeBox').dataset.targetMode = '1v1';
        // Emparejamiento automático instantáneo en la sala pública global de 1v1
        connectPoolOnline('global_match_1v1', '1v1');
      };
    }

    const b2Online = document.getElementById('btnMode2v2Online');
    if (b2Online) {
      b2Online.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = false;
        document.getElementById('onlinePanelTitle').textContent = '🔥 2v2 Pareja vs Pareja Online';
        document.getElementById('roomCodeBox').dataset.targetMode = '2v2';
        // Emparejamiento automático instantáneo en la sala pública global de 2v2
        connectPoolOnline('global_match_2v2', '2v2');
      };
    }

    const btnCancel = document.getElementById('btnCancelOnline');
    if (btnCancel) {
      btnCancel.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = true;
        if (poolWs) {
          try { poolWs.close(); } catch (err) { }
        }
      };
    }

    const btnJoin = document.getElementById('btnJoinRoom');
    if (btnJoin) {
      btnJoin.onclick = (e) => {
        e.stopPropagation();
        const input = document.getElementById('inputRoomCode');
        const code = (input?.value || '').trim().toUpperCase();
        if (!code) {
          alert('Por favor ingresa un código de sala.');
          return;
        }
        const mode = document.getElementById('roomCodeBox').dataset.targetMode || '2v2';
        connectPoolOnline(code, mode);
      };
    }

    const btnQuick = document.getElementById('btnQuickMatch');
    if (btnQuick) {
      btnQuick.onclick = (e) => {
        e.stopPropagation();
        const mode = document.getElementById('roomCodeBox').dataset.targetMode || '2v2';
        connectPoolOnline(`global_match_${mode}`, mode);
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initPoolModeSelector);
  } else {
    window.initPoolModeSelector();
  }
})();
