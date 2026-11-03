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
  let handThrottle = 0;
  let lastSentYaw = null;
  let lastSentPw = null;
  let lastSentAimTime = 0;
  let shotOwnerSeat = null;   // Asiento de quien hizo el tiro en curso (solo él reporta turn_end)
  let finishFallbackTimer = null;
  let matchStarted = false;
  let roomOverflowIndex = 0;

  function normalizeGameMode(subMode, mode) {
    if (subMode === '1v1' || subMode === '1v1_online' || (!subMode && mode === '1v1')) return '1v1_online';
    if (subMode === '2v2_cpu') return '2v2_cpu';
    if (subMode === '2v2_online' || mode === '2v2') return '2v2_online';
    return '1v1_online';
  }

  const isOnline = () =>
    currentGameMode === '1v1_online' ||
    currentGameMode === '2v2_online' ||
    (currentGameMode === '2v2_cpu' && poolWs && poolWs.readyState === WebSocket.OPEN);

  const is1v1 = () =>
    currentGameMode === '1v1_online' ||
    currentGameMode === '1v1' ||
    currentGameMode === '1v1_cpu';

  window.getPoolMaxSeats = function () {
    return is1v1() ? 2 : 4;
  };

  window.getMyPoolTeam = function () {
    if (currentGameMode === '1v1_cpu' || currentGameMode === '2v2_cpu') return 0; // Humano/Pareja siempre son equipo Rojo (0)
    if (isOnline()) return myPlayerSeat % 2; // Asientos 0 y 2 = Rojo (0), Asientos 1 y 3 = Azul (1)
    return window.turn % 2;
  };

  function isCpuTurnNow() {
    return (currentGameMode === '1v1_cpu' && window.turn === 1) ||
      (currentGameMode === '2v2_cpu' && (window.turn === 1 || window.turn === 3));
  }

  function isCpuAuthority() {
    if (currentGameMode === '1v1_cpu') return true;
    if (currentGameMode === '2v2_cpu') {
      if (poolWs && poolWs.readyState === WebSocket.OPEN) {
        return myPlayerSeat === 0;
      }
      return true;
    }
    return false;
  }

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

  function updatePowerBarState() {
    const pwEl = document.getElementById('pw');
    if (!pwEl) return;
    const myTurn = window.isPoolMyTurn();
    pwEl.style.opacity = myTurn ? '1' : '0.32';
    pwEl.style.pointerEvents = myTurn ? 'auto' : 'none';
    pwEl.style.filter = myTurn ? 'none' : 'grayscale(0.8)';
  }

  function turnMsg() {
    updatePowerBarState();
    if (window.isPoolMyTurn()) {
      setMsg(window.hand ? '¡Tu turno! Coloca la blanca y luego tira.' : '¡Tu turno! Apunta y mantén FUERZA.');
    } else {
      const activeName = (window.NAMES && window.NAMES[window.turn]) || 'Rival';
      setMsg('Turno de ' + activeName + ' · viendo su jugada en vivo...');
    }
  }
  window.onPoolTurnMsg = turnMsg;

  window.isRivalAiming = function () {
    return (isOnline() || isCpuTurnNow()) && !window.isPoolMyTurn() && !window.moving && !window.hand && rivalAimData != null;
  };

  window.getRivalAimData = function () {
    return rivalAimData;
  };

  // Helper estricto para saber si el usuario local puede interactuar con la mesa
  window.isPoolMyTurn = function () {
    const modal = document.getElementById('modeModal');
    if (modal && !modal.hidden) return false;

    if (currentGameMode === '1v1_cpu') {
      return window.turn === 0; // Humano es Asiento 0 (Rojo)
    }
    if (currentGameMode === '2v2_cpu') {
      if (poolWs && poolWs.readyState === WebSocket.OPEN) {
        return matchStarted && window.turn === myPlayerSeat;
      }
      return window.turn === 0 || window.turn === 2;
    }
    if (currentGameMode === '1v1_online' || currentGameMode === '2v2_online') {
      return matchStarted && window.turn === myPlayerSeat;
    }
    return true; // En modo local todos los turnos son interactuables
  };

  // Permite disparar localmente solo si es mi turno o si soy la autoridad del turno CPU
  window.canLocalShoot = function () {
    if (window.isPoolMyTurn()) return true;
    if (isCpuTurnNow() && isCpuAuthority()) return true;
    return false;
  };

  // En partidas online, solo quien efectuó el tiro ejecuta finish() y emite turn_end;
  // el receptor espera el paquete autoritativo turn_end para evitar doble evaluación o desfase
  window.shouldSkipLocalFinish = function () {
    if (!isOnline()) return false;
    const isMyAuthoritativeShot =
      shotOwnerSeat === myPlayerSeat ||
      (isCpuTurnNow() && isCpuAuthority());
    if (isMyAuthoritativeShot) return false;

    if (finishFallbackTimer) clearTimeout(finishFallbackTimer);
    finishFallbackTimer = setTimeout(() => {
      finishFallbackTimer = null;
      if (shotOwnerSeat !== null && shotOwnerSeat !== myPlayerSeat) {
        shotOwnerSeat = null;
        if (window.originalFinish) window.originalFinish();
        turnMsg();
      }
    }, 1500);
    return true;
  };

  // 1. TRANSMISIÓN EN VIVO DEL APUNTADO (Emisor hacia WebSocket a 30 Hz cuando cambia o pulso cada 400ms)
  window.onPoolAimTransmit = function (a, l) {
    const canSendAim = window.isPoolMyTurn() || (isCpuTurnNow() && isCpuAuthority());
    if (isOnline() && poolWs && poolWs.readyState === WebSocket.OPEN && canSendAim) {
      const now = performance.now();
      const yaw = Number(a.toFixed(4));
      const pw = Number((l / 180).toFixed(3));
      const changed = lastSentYaw === null || Math.abs(yaw - lastSentYaw) > 0.0005 || Math.abs(pw - lastSentPw) > 0.002;
      const keepAliveAim = (now - lastSentAimTime) > 400;

      if ((changed && (now - wsThrottle > 33)) || keepAliveAim) {
        wsThrottle = now;
        lastSentAimTime = now;
        lastSentYaw = yaw;
        lastSentPw = pw;
        poolWs.send(JSON.stringify({
          t: 'aim',
          yaw,
          pw
        }));
      }
    }
  };

  // 1B. TRANSMISIÓN EN VIVO DE BOLA EN MANO
  window.onPoolHandMoveTransmit = function (x, y, stillInHand) {
    if (isOnline() && poolWs && poolWs.readyState === WebSocket.OPEN && window.isPoolMyTurn()) {
      const now = performance.now();
      if (!stillInHand || (now - handThrottle > 33)) {
        handThrottle = now;
        poolWs.send(JSON.stringify({
          t: 'hand_move',
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          hand: !!stillInHand
        }));
        if (!stillInHand) {
          lastSentAimTime = 0; // Forzar envío inmediato de la mira tras soltar la blanca
        }
      }
    }
  };

  // 2. TRANSMISIÓN DEL DISPARO (incluye snapshot de bolas para que el rival simule exactamente lo mismo)
  window.onPoolShootTransmit = function (a, p) {
    const canSendShot = window.isPoolMyTurn() || (isCpuTurnNow() && isCpuAuthority());
    if (isOnline() && poolWs && poolWs.readyState === WebSocket.OPEN && canSendShot) {
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
    // En 1v1 solo existen los asientos 0 y 1
    if (is1v1() && window.turn > 1) {
      window.turn = window.turn % 2;
      window.ui();
    }

    if (isOnline()) {
      // Solo quien disparó (o la autoridad de la CPU en 2v2_cpu) reporta turn_end
      if (shotOwnerSeat === myPlayerSeat && poolWs && poolWs.readyState === WebSocket.OPEN) {
        poolWs.send(JSON.stringify({
          t: 'turn_end',
          nextTurn: window.turn,
          pot: window.pot,
          grp: window.grp,
          tray: window.tray,
          hand: !!window.hand,
          over: window.over,
          balls: snapshotBalls()
        }));
        shotOwnerSeat = null;
      }
      lastSentAimTime = 0;
      if (!window.isPoolMyTurn() && !window.hand && window.over == null) {
        rivalAimData = { yaw: window.aimYaw || 0, pw: 0 };
      } else {
        rivalAimData = null;
      }
      turnMsg();
      checkCpuTurn();
      return;
    }

    turnMsg();
    checkCpuTurn();
  };

  // Muestra el banner épico de enfrentamiento "Tú VS Rival" o "Dúo 1 VS Dúo 2"
  function showEpicVsBanner(nameRed, nameBlue) {
    const overlay = document.getElementById('vsMatchOverlay');
    const p1El = document.getElementById('vsPlayer1');
    const p2El = document.getElementById('vsPlayer2');
    const subEl = document.getElementById('vsSubtitle');
    if (!overlay || !p1El || !p2El) return;

    p1El.textContent = nameRed || 'Rojo';
    p2El.textContent = nameBlue || 'Azul';
    if (subEl) {
      const isRed = myPlayerSeat % 2 === 0;
      subEl.textContent = isRed ? `¡${nameRed} abre la mesa! Que comience el duelo.` : `¡${nameRed} rompe! Prepárate para tu turno.`;
    }

    overlay.hidden = false;
    overlay.classList.remove('vs-exit');

    // Efecto de sonido si está disponible el audio
    try {
      if (typeof window.notify === 'function') {
        window.notify('⚔️ DUELO INICIADO', `${nameRed} VS ${nameBlue}`, true, 3500);
      }
    } catch (e) { }

    // Desaparece con animación suave tras 2.8 segundos
    setTimeout(() => {
      overlay.classList.add('vs-exit');
      setTimeout(() => {
        overlay.hidden = true;
        overlay.classList.remove('vs-exit');
      }, 400);
    }, 2800);
  }

  // Arranque sincronizado de la partida para todos los jugadores
  function startMatch(playersList) {
    if (matchStarted) return;
    matchStarted = true;
    const spinnerEl = document.getElementById('matchmakingSpinner');
    if (spinnerEl) spinnerEl.hidden = true;
    const coupleCard = document.getElementById('coupleReadyCard');
    if (coupleCard) coupleCard.hidden = true;
    document.getElementById('modeModal').hidden = true;

    const p = new URLSearchParams(window.location.search);
    const myName = p.get('name') || 'Tú';
    const partnerName = p.get('partnerName') || 'Tu Pareja';
    const isPartner = p.get('isPartner') === '1';

    let pRedName = '';
    let pBlueName = '';

    if (currentGameMode === '2v2_cpu') {
      pRedName = `${p.get('duoName') || (isPartner ? `${partnerName} & ${myName}` : `${myName} & ${partnerName}`)}`;
      pBlueName = 'Dúo Bots IA';
      window.TEAM_NAMES = [pRedName, pBlueName];
      window.NAMES[0] = isPartner ? partnerName : myName;
      window.NAMES[1] = 'IA Bot 1 (Azul)';
      window.NAMES[2] = isPartner ? myName : partnerName;
      window.NAMES[3] = 'IA Bot 2 (Azul)';
    } else if (is1v1()) {
      // Modo 1v1 Online: nombres individuales exactos sincronizados desde el servidor para ambos navegadores
      const p0 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 0) : null;
      const p1 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 1) : null;
      pRedName = (p0 && p0.name) || (myPlayerSeat === 0 ? myName : 'Jugador 1');
      pBlueName = (p1 && p1.name) || (myPlayerSeat === 1 ? myName : 'Jugador 2');

      window.TEAM_NAMES = [pRedName, pBlueName];
      window.NAMES[0] = pRedName;
      window.NAMES[1] = pBlueName;
      window.NAMES[2] = pRedName;
      window.NAMES[3] = pBlueName;
    } else {
      // Modo 2v2 Online: 4 jugadores (2 parejas) sincronizados desde el servidor
      const p0 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 0) : null;
      const p1 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 1) : null;
      const p2 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 2) : null;
      const p3 = Array.isArray(playersList) ? playersList.find(pl => pl.seat === 3) : null;

      window.NAMES[0] = (p0 && p0.name) || 'Rojo 1';
      window.NAMES[1] = (p1 && p1.name) || 'Azul 1';
      window.NAMES[2] = (p2 && p2.name) || 'Rojo 2';
      window.NAMES[3] = (p3 && p3.name) || 'Azul 2';

      pRedName = (p0 && p2) ? `${p0.name} & ${p2.name}` : window.NAMES[0];
      pBlueName = (p1 && p3) ? `${p1.name} & ${p3.name}` : window.NAMES[1];
      window.TEAM_NAMES = [pRedName, pBlueName];
    }

    window.newGame();
    window.turn = 0;
    lastSentAimTime = 0;
    lastSentYaw = null;
    lastSentPw = null;
    shotOwnerSeat = null;
    if (!window.isPoolMyTurn()) {
      rivalAimData = { yaw: window.aimYaw || 0, pw: 0 };
    } else {
      rivalAimData = null;
    }
    window.ui();
    turnMsg();

    // Lanzar la animación cinemática de VS
    showEpicVsBanner(pRedName, pBlueName);
  }

  // 4. INTELIGENCIA ARTIFICIAL (BOT CPU CON GEOMETRÍA GHOST-BALL Y ANIMACIÓN EN VIVO)
  let cpuAimInterval = null;
  let cpuThinkTimeout = null;

  // Verifica si el segmento (x1,y1)->(x2,y2) está libre de otras bolas (radio de colisión 2*R = 24)
  function isSegmentClear(x1, y1, x2, y2, ignoreId1, ignoreId2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-4) return true;
    const len = Math.sqrt(lenSq);

    for (const b of window.B) {
      if (b.in || b.i === ignoreId1 || b.i === ignoreId2) continue;
      // Proyección de la bola sobre el segmento
      const t = ((b.x - x1) * dx + (b.y - y1) * dy) / lenSq;
      if (t <= 0.02 || t >= 0.98) continue;
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      const dist = Math.hypot(b.x - projX, b.y - projY);
      if (dist < 23.4) return false;
    }
    return true;
  }

  function checkCpuTurn() {
    if (window.over != null || window.moving) return;
    if (!isCpuTurnNow()) return;

    if (cpuThinkTimeout) clearTimeout(cpuThinkTimeout);
    if (cpuAimInterval) clearInterval(cpuAimInterval);

    const cpuName = (window.NAMES && window.NAMES[window.turn]) || 'IA Rival';
    const M = document.getElementById('msg');
    if (M) M.textContent = 'La IA ' + cpuName + ' está apuntando...';
    updatePowerBarState();

    // Mostrar el taco de la IA de inmediato detrás de la bola blanca
    rivalAimData = { yaw: window.aimYaw || 0, pw: 0 };

    // En 2v2_cpu conectado por WebSocket, solo el asiento 0 calcula y transmite el tiro de la CPU
    if (!isCpuAuthority()) return;

    cpuThinkTimeout = setTimeout(() => {
      if (window.over != null || window.moving || !isCpuTurnNow()) return;

      const t = window.turn % 2;
      const myGrp = window.grp[t];

      const legalBalls = window.B.filter(b => {
        if (b.i === 0 || b.in) return false;
        if (!myGrp) return b.i !== 8;
        const hasRemaining = window.B.some(other => other.i !== 0 && other.i !== 8 && !other.in && window.own(other.i, t));
        if (hasRemaining) return window.own(b.i, t);
        return b.i === 8;
      });

      const poolTarget = legalBalls.length > 0 ? legalBalls : window.B.filter(b => b.i !== 0 && !b.in);

      // Si la IA tiene "bola en mano" por falta previa del jugador, colocar la blanca en una posición óptima
      if (window.hand) {
        window.startHand();
        const c0 = window.B[0];
        let bestHandPos = null;
        let bestHandScore = -1e9;
        const candidates = [
          [250, 260], [220, 160], [220, 360],
          [380, 160], [380, 360], [500, 260],
          [620, 160], [620, 360]
        ];
        for (const [cx, cy] of candidates) {
          const valid = cx >= 72 && cx <= 928 && cy >= 72 && cy <= 448 &&
            window.B.every(b => b.i === 0 || b.in || Math.hypot(b.x - cx, b.y - cy) > 26);
          if (!valid) continue;
          for (const tb of poolTarget) {
            if (isSegmentClear(cx, cy, tb.x, tb.y, 0, tb.i)) {
              const d = Math.hypot(tb.x - cx, tb.y - cy);
              const sc = 500 - d;
              if (sc > bestHandScore) {
                bestHandScore = sc;
                bestHandPos = [cx, cy];
              }
            }
          }
        }
        if (bestHandPos) {
          c0.x = bestHandPos[0];
          c0.y = bestHandPos[1];
        }
        window.hand = false;
        window.setMode(true);
        if (window.onPoolHandMoveTransmit) {
          window.onPoolHandMoveTransmit(c0.x, c0.y, false);
        }
      }

      const c = window.B[0];
      let finalAngle = 0;
      let force = 0.65;

      // Caso 1: Saque inicial (rotura del triángulo)
      if (window.brk) {
        const apex = window.B.find(b => b.i === 1 && !b.in) || poolTarget[0];
        finalAngle = apex ? Math.atan2(apex.y - c.y, apex.x - c.x) + (Math.random() - 0.5) * 0.025 : 0;
        force = 0.88 + Math.random() * 0.08;
      } else {
        // Caso 2: Búsqueda de tiro con geometría real de Bola Fantasma (Ghost Ball, diámetro 2*R = 24)
        let bestShot = null;
        let bestScore = -1e9;

        for (const b of poolTarget) {
          for (const pk of window.PK) {
            // Desplazar ligeramente el punto objetivo de la tronera hacia el centro de la mesa para evitar los cuernos
            const aimPkX = pk[0] + (500 - pk[0]) * 0.025;
            const aimPkY = pk[1] + (260 - pk[1]) * 0.025;

            const dxP = aimPkX - b.x;
            const dyP = aimPkY - b.y;
            const distBToP = Math.hypot(dxP, dyP);
            if (distBToP < 1) continue;

            const uxP = dxP / distBToP;
            const uyP = dyP / distBToP;

            // Posición exacta donde debe impactar el centro de la bola blanca (Ghost Ball a 24 unidades)
            const gx = b.x - uxP * 24;
            const gy = b.y - uyP * 24;

            // Verificar que la Ghost Ball esté dentro de los límites jugables del paño
            if (gx < 72 || gx > 928 || gy < 72 || gy > 448) continue;

            const dxC = gx - c.x;
            const dyC = gy - c.y;
            const distCToG = Math.hypot(dxC, dyC);
            if (distCToG < 1) continue;

            const uxC = dxC / distCToG;
            const uyC = dyC / distCToG;

            // Coseno del ángulo de corte (> 0.16 evita cortes imposibles o golpes por detrás)
            const cosCut = uxC * uxP + uyC * uyP;
            if (cosCut < 0.16) continue;

            const clearCueToGhost = isSegmentClear(c.x, c.y, gx, gy, 0, b.i);
            const clearBallToPocket = isSegmentClear(b.x, b.y, aimPkX, aimPkY, b.i, 0);

            const score =
              (cosCut * 140) +
              (clearCueToGhost ? 240 : -320) +
              (clearBallToPocket ? 180 : -200) -
              (distBToP * 0.16) -
              (distCToG * 0.11);

            if (score > bestScore) {
              bestScore = score;
              bestShot = { b, gx, gy, cosCut, distBToP, distCToG, clearCueToGhost };
            }
          }
        }

        if (bestShot && bestShot.clearCueToGhost) {
          const exactAngle = Math.atan2(bestShot.gy - c.y, bestShot.gx - c.x);
          // Pequeña variación humana natural (~0.35°) para que juegue muy bien sin ser infalible
          const imperfection = (Math.random() - 0.5) * 0.012;
          finalAngle = exactAngle + imperfection;
          const rawForce = 0.38 + (bestShot.distCToG + bestShot.distBToP) / 1450 + (1 - bestShot.cosCut) * 0.18;
          force = Math.max(0.40, Math.min(0.82, rawForce));
        } else {
          // Tiro de seguridad / desbloqueo hacia una bola legal con camino despejado
          let fallbackBall = poolTarget.find(b => isSegmentClear(c.x, c.y, b.x, b.y, 0, b.i)) || poolTarget[0] || window.B[1];
          finalAngle = Math.atan2(fallbackBall.y - c.y, fallbackBall.x - c.x) + (Math.random() - 0.5) * 0.02;
          force = 0.52 + Math.random() * 0.18;
        }
      }

      // Animar suavemente el giro del taco y la barra de fuerza de la IA (~640ms) antes de disparar
      const startYaw = typeof window.aimYaw === 'number' ? window.aimYaw : finalAngle;
      const angleDiff = Math.atan2(Math.sin(finalAngle - startYaw), Math.cos(finalAngle - startYaw));
      const totalSteps = 16;
      let stepIdx = 0;

      cpuAimInterval = setInterval(() => {
        if (window.over != null || window.moving || !isCpuTurnNow()) {
          clearInterval(cpuAimInterval);
          cpuAimInterval = null;
          return;
        }
        stepIdx++;
        const progress = Math.min(1, stepIdx / totalSteps);
        // Curva suave easeOutCubic para el giro del taco
        const ease = 1 - Math.pow(1 - progress, 3);
        const curYaw = startYaw + angleDiff * ease;
        const curPw = progress < 0.35 ? 0 : force * ((progress - 0.35) / 0.65);

        rivalAimData = { yaw: curYaw, pw: curPw };
        window.setAimYaw(curYaw);
        window.aim(curYaw, curPw * 180);
        window.rd.shadowMap.needsUpdate = true;

        if (stepIdx >= totalSteps) {
          clearInterval(cpuAimInterval);
          cpuAimInterval = null;
          setTimeout(() => {
            const engineIdle = window.originalIdle ? window.originalIdle() : (!window.moving && window.over == null);
            if (engineIdle && isCpuTurnNow()) {
              rivalAimData = null;
              window.shoot(finalAngle, force);
            }
          }, 220);
        }
      }, 40);
    }, 550);
  }

  let queueTimeoutTimer = null;
  let heartbeatTimer = null;
  let lastConnectAttempt = 0;

  // Cancela la búsqueda y limpia completamente sockets y timers
  function cancelMatchmaking() {
    if (queueTimeoutTimer) {
      clearTimeout(queueTimeoutTimer);
      queueTimeoutTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (finishFallbackTimer) {
      clearTimeout(finishFallbackTimer);
      finishFallbackTimer = null;
    }
    if (cpuThinkTimeout) {
      clearTimeout(cpuThinkTimeout);
      cpuThinkTimeout = null;
    }
    if (cpuAimInterval) {
      clearInterval(cpuAimInterval);
      cpuAimInterval = null;
    }
    if (poolWs) {
      try {
        poolWs.onopen = null;
        poolWs.onmessage = null;
        poolWs.onerror = null;
        poolWs.onclose = null;
        poolWs.close(1000, 'USER_CANCELLED');
      } catch (e) {}
      poolWs = null;
    }
    matchStarted = false;
    shotOwnerSeat = null;
    rivalAimData = null;
  }

  // 5. GESTOR DE WEBSOCKET ONLINE
  function connectPoolOnline(roomId, mode, subMode) {
    // 1. Rate Limiting anti-spam en el cliente: evitar clicks desesperados continuos (< 1 segundo)
    const now = Date.now();
    if (now - lastConnectAttempt < 1000) {
      window.notify('UN MOMENTO', 'Por favor espera un segundo antes de volver a buscar.', false, 1500);
      return;
    }
    lastConnectAttempt = now;

    // 2. Limpieza exhaustiva de cualquier conexión o timer previo
    cancelMatchmaking();

    const p = new URLSearchParams(window.location.search);
    const isPartner = p.get('isPartner') === '1';
    const myName = p.get('name') || (isPartner ? 'Pareja' : 'Titular');
    const partnerName = p.get('partnerName') || (isPartner ? 'Titular' : 'Pareja');

    // Cada pestaña/sesión tiene su propio id de conexión para que 2 pestañas locales o cuentas no colisionen
    let sessionTabId = sessionStorage.getItem('pool_tab_session_id');
    if (!sessionTabId) {
      sessionTabId = 'tab_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('pool_tab_session_id', sessionTabId);
    }
    const uid = (p.get('auth') ? p.get('auth') + '_' : '') + (isPartner ? 'partner_' : 'owner_') + sessionTabId;
    const coupleSeat = isPartner ? '2' : '0';

    const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const paramBackend = p.get('backendUrl');

    let wsProtocol = 'wss:';
    let apiHost = 'bakeend-love-api.centinal-cl.workers.dev';

    if (isLocalhost) {
      wsProtocol = 'ws:';
      apiHost = 'localhost:8787';
    } else if (paramBackend) {
      try {
        const u = new URL(paramBackend);
        wsProtocol = u.protocol === 'http:' ? 'ws:' : 'wss:';
        apiHost = u.host;
      } catch (e) {
        // Fallback al host predeterminado
      }
    }

    const actualSubMode = normalizeGameMode(subMode, mode);
    currentGameMode = actualSubMode;
    const coupleId = p.get('coupleId') || '';
    const wsUrl = `${wsProtocol}//${apiHost}/api/pool/ws?room=${encodeURIComponent(roomId)}&mode=${mode}&subMode=${encodeURIComponent(actualSubMode)}&uid=${encodeURIComponent(uid)}&name=${encodeURIComponent(myName)}&coupleSeat=${coupleSeat}&coupleId=${encodeURIComponent(coupleId)}`;

    const statusEl = document.getElementById('onlineStatusMsg');
    const spinnerEl = document.getElementById('matchmakingSpinner');
    const spinnerText = document.getElementById('matchmakingSpinnerText');
    const coupleCard = document.getElementById('coupleReadyCard');
    const coupleText = document.getElementById('coupleReadyText');
    const dotMe = document.getElementById('dotPlayerMe');
    const dotPartner = document.getElementById('dotPlayerPartner');
    const nameMeEl = document.getElementById('namePlayerMe');
    const namePartnerEl = document.getElementById('namePlayerPartner');
    const btnReady = document.getElementById('btnImReady');
    const roomCodeBox = document.getElementById('roomCodeBox');

    if (nameMeEl) nameMeEl.textContent = myName;
    if (namePartnerEl) namePartnerEl.textContent = partnerName;

    if (actualSubMode === '2v2_cpu' || actualSubMode === '2v2_online') {
      if (coupleCard) coupleCard.hidden = false;
      if (roomCodeBox) roomCodeBox.hidden = true;
      if (btnReady) {
        btnReady.disabled = true;
        btnReady.classList.remove('ready-active');
        btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Esperando que se una tu pareja...`;
        btnReady.onclick = (e) => {
          e.stopPropagation();
          if (btnReady.disabled) return;
          btnReady.disabled = true;
          btnReady.classList.add('ready-active');
          btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ¡Confirmado! Esperando confirmación de tu pareja...`;
          if (dotMe) { dotMe.className = 'pill-dot ready'; }
          if (poolWs && poolWs.readyState === WebSocket.OPEN) {
            poolWs.send(JSON.stringify({ t: 'player_ready' }));
          }
        };
      }
    } else {
      if (coupleCard) coupleCard.hidden = true;
      if (roomCodeBox) roomCodeBox.hidden = false;
    }

    if (statusEl) statusEl.textContent = 'Conectando a la sala...';
    if (spinnerEl) spinnerEl.hidden = false;
    if (spinnerText) spinnerText.textContent = actualSubMode === '2v2_cpu' ? 'Conectando con tu pareja...' : 'Buscando participantes...';

    poolWs = new WebSocket(wsUrl);

    poolWs.onopen = () => {
      if (statusEl) statusEl.textContent = '¡Conectado a la sala! Buscando oponente...';

      // Enviar Heartbeat Ping cada 15 segundos para evitar desconexiones por inactividad
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (poolWs && poolWs.readyState === WebSocket.OPEN) {
          try { poolWs.send(JSON.stringify({ t: 'ping' })); } catch (e) {}
        }
      }, 15000);

      // Timeout de búsqueda (60 segundos): evita colas infinitas si no hay nadie buscando
      if (queueTimeoutTimer) clearTimeout(queueTimeoutTimer);
      queueTimeoutTimer = setTimeout(() => {
        if (!matchStarted) {
          cancelMatchmaking();
          if (statusEl) statusEl.textContent = 'Tiempo de espera agotado. No se encontró rival en este momento.';
          if (spinnerEl) spinnerEl.hidden = true;
          window.notify('TIEMPO AGOTADO', 'No se encontraron contrincantes en este momento. Intenta nuevamente.', false, 4000);
        }
      }, 60000);
    };

    poolWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[PoolOnline] Mensaje recibido del servidor:', data);

        // A. Bienvenida y asignación de asiento
        if (data.t === 'welcome') {
          myPlayerSeat = data.seat;
          currentGameMode = normalizeGameMode(data.subMode, data.mode);
          window.NAMES[myPlayerSeat] = myName;
          if (data.turn != null) window.turn = data.turn;
          window.ui();

          const reqSeats = (currentGameMode === '2v2_cpu' || currentGameMode === '1v1_online') ? 2 : 4;
          const currentCount = (data.players && data.players.length) || 1;

          // Si es 1v1 Online, arrancar en cuanto haya 2 jugadores conectados
          if (currentGameMode === '1v1_online') {
            if (statusEl) {
              statusEl.textContent = `Asiento ${myPlayerSeat + 1} asignado. Conectados: ${currentCount}/${reqSeats}`;
            }
            if (currentCount >= reqSeats) {
              startMatch(data.players);
            }
            return;
          }

          if (currentCount < 2) {
            if (coupleText) coupleText.textContent = `Tu pareja aún no se ha unido a la sala.`;
            if (dotPartner) dotPartner.className = 'pill-dot waiting';
            if (btnReady) {
              btnReady.disabled = true;
              btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Esperando que se una tu pareja...`;
            }
          } else {
            if (coupleText) coupleText.textContent = `¡Tu pareja está en la sala esperando para empezar!`;
            if (dotPartner) dotPartner.className = 'pill-dot';
            if (btnReady && !btnReady.classList.contains('ready-active')) {
              btnReady.disabled = false;
              btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ¡Estoy Listo para Jugar!`;
            }
          }

          if (data.players) {
            const partnerPl = data.players.find(p => p.seat !== myPlayerSeat);
            if (partnerPl && partnerPl.isReady && dotPartner) {
              dotPartner.className = 'pill-dot ready';
              if (coupleText) coupleText.textContent = `¡Tu pareja ya está lista y esperando para empezar!`;
            }
          }

          if (statusEl) {
            statusEl.textContent = `Conectados: ${currentCount}/${reqSeats}`;
          }
        }

        // A2. Sala llena: saltar inmediatamente a la siguiente sala disponible
        if (data.t === 'room_full') {
          roomOverflowIndex = (roomOverflowIndex + 1) % 10;
          const baseRoom = roomId.replace(/_\d+$/, '');
          const nextRoom = `${baseRoom}_${roomOverflowIndex}`;
          if (statusEl) statusEl.textContent = 'Sala ocupada, conectando a mesa disponible...';
          lastConnectAttempt = 0;
          setTimeout(() => {
            connectPoolOnline(nextRoom, mode, actualSubMode);
          }, 250);
          return;
        }

        // B. Nuevo jugador entra
        if (data.t === 'player_joined') {
          const reqSeats = (currentGameMode === '2v2_cpu' || currentGameMode === '1v1_online') ? 2 : 4;
          const currentCount = (data.players && data.players.length) || 2;

          // Si es 1v1 Online, avisar y arrancar de inmediato
          if (currentGameMode === '1v1_online') {
            window.notify('RIVAL CONECTADO', `${data.name} entró a la partida`, false, 2000);
            if (statusEl) {
              statusEl.textContent = `¡Rival encontrado! Conectados: ${currentCount}/${reqSeats}`;
            }
            if (currentCount >= reqSeats) {
              const roster = data.players;
              setTimeout(() => startMatch(roster), 250);
            }
            return;
          }

          window.notify('PAREJA CONECTADA', `¡Tu pareja entró a la sala!`, false, 2500);
          if (coupleText) coupleText.textContent = `¡Tu pareja está esperando para empezar!`;
          if (dotPartner) dotPartner.className = 'pill-dot';
          if (btnReady && !btnReady.classList.contains('ready-active')) {
            btnReady.disabled = false;
            btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ¡Estoy Listo para Jugar!`;
          }
          if (statusEl) {
            statusEl.textContent = `¡Ambos en sala! Conectados: ${currentCount}/${reqSeats}`;
          }
        }

        // B2. Un jugador sale
        if (data.t === 'player_left') {
          if (dotPartner) dotPartner.className = 'pill-dot waiting';
          if (coupleText) coupleText.textContent = `Tu pareja salió o se desconectó de la sala.`;
          if (btnReady) {
            btnReady.disabled = true;
            btnReady.classList.remove('ready-active');
            btnReady.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Esperando que se una tu pareja...`;
          }
          if (dotMe) dotMe.className = 'pill-dot';
        }

        // C. Confirmación de LISTO / AMBOS LISTOS
        if (data.t === 'player_ready') {
          if (data.seat !== myPlayerSeat) {
            // Verificar si el que puso listo es de mi propia pareja
            const pReady = data.players && data.players.find(p => p.seat === data.seat);
            const isMyCouplePartner = pReady && (pReady.coupleId === coupleId || (data.seat === 0 || data.seat === 2));

            if (isMyCouplePartner && dotPartner) {
              dotPartner.className = 'pill-dot ready';
              if (coupleText) coupleText.textContent = `¡Tu pareja está lista!`;
              window.notify('¡PAREJA LISTA!', `${data.name} ya está listo para jugar.`, true, 2000);
            }
          }

          if (currentGameMode === '2v2_online') {
            const currentTotal = data.totalConnected || (data.players ? data.players.length : 2);
            if (currentTotal < 4) {
              if (coupleText) coupleText.textContent = `Pareja lista. Esperando pareja rival en cola (${currentTotal}/4 jugadores)...`;
              if (spinnerText) spinnerText.textContent = `Buscando pareja rival en cola (${currentTotal}/4)...`;
            }
          }

          if (data.allReady) {
            if (coupleText) coupleText.textContent = `¡Todos listos! Iniciando la mesa...`;
            setTimeout(() => {
              startMatch(data.players);
            }, 600);
          }
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

        // C2. MOVIMIENTO EN VIVO DE BOLA BLANCA EN MANO
        if (data.t === 'hand_move') {
          if (data.seat !== myPlayerSeat && window.B && window.B[0]) {
            window.B[0].x = data.x;
            window.B[0].y = data.y;
            window.B[0].in = 0;
            window.B[0].vx = 0;
            window.B[0].vy = 0;
            if (data.hand === false && window.hand) {
              window.hand = false;
              window.setMode(true);
              rivalAimData = { yaw: window.aimYaw || 0, pw: 0 };
            }
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
          if (finishFallbackTimer) {
            clearTimeout(finishFallbackTimer);
            finishFallbackTimer = null;
          }
          shotOwnerSeat = null;
          window.moving = false;
          window.brk = false;
          applyBalls(data.balls);
          if (data.grp) window.grp = data.grp;
          if (Array.isArray(data.tray)) {
            window.tray = data.tray;
          } else if (Array.isArray(data.balls)) {
            window.tray = data.balls.filter(b => b.i !== 0 && b.in).map(b => b.i);
          }
          window.turn = data.nextTurn;
          if (data.over !== undefined) window.over = data.over;

          const wantHand = !!data.hand;
          if (wantHand && !window.hand) { window.hand = true; window.startHand(); }
          else if (!wantHand && window.hand) { window.hand = false; window.setMode(true); }

          lastSentAimTime = 0;
          if (!window.isPoolMyTurn() && !wantHand && window.over == null) {
            rivalAimData = { yaw: window.aimYaw || 0, pw: 0 };
          } else {
            rivalAimData = null;
          }

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
            checkCpuTurn();
          } else {
            const won = (window.over === (myPlayerSeat % 2));
            if (window.enviarRecompensaPool) {
              window.enviarRecompensaPool({
                win: won,
                score: (window.tray && window.tray.length) || 0,
                durationMs: 300000
              });
            }
            window.notify(
              won ? '¡VICTORIA ÉPICA!' : 'FIN DE LA PARTIDA',
              won ? 'Tu equipo ganó la partida.' : `Gana ${window.TEAM_NAMES ? window.TEAM_NAMES[window.over] : 'el rival'}.`,
              won,
              4000
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
        cancelMatchmaking();
        currentGameMode = '2v2_local';
        matchStarted = true;
        window.TEAM_NAMES = ['Equipo Rojo', 'Equipo Azul'];
        window.NAMES[0] = 'Rojo 1';
        window.NAMES[1] = 'Azul 1';
        window.NAMES[2] = 'Rojo 2';
        window.NAMES[3] = 'Azul 2';
        modal.hidden = true;
        window.newGame();
        window.ui();
        turnMsg();
      };
    }

    // Botones de retroceder / salir al catálogo
    const btnExitModal = document.getElementById('btnExitToCatalogModal');
    const btnExitBottom = document.getElementById('btnBackCatalogBottom');

    if (btnExitModal) btnExitModal.onclick = (e) => { e.stopPropagation(); exitToCatalog(); };
    if (btnExitBottom) btnExitBottom.onclick = (e) => { e.stopPropagation(); exitToCatalog(); };

    const b1Cpu = document.getElementById('btnMode1v1Cpu');
    if (b1Cpu) {
      b1Cpu.onclick = (e) => {
        e.stopPropagation();
        cancelMatchmaking();
        currentGameMode = '1v1_cpu';
        matchStarted = true;
        myPlayerSeat = 0;
        const p = new URLSearchParams(window.location.search);
        const myName = p.get('name') || 'Tú (Rojo)';
        window.TEAM_NAMES = [myName, 'IA Rival (Azul)'];
        window.NAMES[0] = myName;
        window.NAMES[1] = 'IA Rival (Azul)';
        window.NAMES[2] = myName;
        window.NAMES[3] = 'IA Rival (Azul)';
        modal.hidden = true;
        window.newGame();
        window.ui();
        turnMsg();
        showEpicVsBanner(myName, 'IA Rival (Azul)');
      };
    }

    const b2Cpu = document.getElementById('btnMode2v2Cpu');
    if (b2Cpu) {
      b2Cpu.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = false;
        document.getElementById('onlinePanelTitle').textContent = '2v2 Pareja vs CPU';
        const p = new URLSearchParams(window.location.search);
        const coupleRoom = 'couple_cpu_' + (p.get('coupleId') || 'room_default');
        // Conexión compartida en tiempo real entre ambos navegadores contra 2 CPUs
        connectPoolOnline(coupleRoom, '2v2', '2v2_cpu');
      };
    }

    const b1Online = document.getElementById('btnMode1v1Online');
    if (b1Online) {
      b1Online.onclick = (e) => {
        e.stopPropagation();
        roomOverflowIndex = 0;
        if (onlinePanel) onlinePanel.hidden = false;
        document.getElementById('onlinePanelTitle').textContent = '1v1 Online';
        document.getElementById('roomCodeBox').dataset.targetMode = '1v1';
        // Emparejamiento automático instantáneo en la sala pública global de 1v1
        connectPoolOnline('global_match_1v1', '1v1', '1v1_online');
      };
    }

    const b2Online = document.getElementById('btnMode2v2Online');
    if (b2Online) {
      b2Online.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = false;
        document.getElementById('onlinePanelTitle').textContent = '2v2 Pareja vs Pareja Online';
        // Sala pública global de 2v2 para emparejar 2 parejas distintas (4 jugadores en total)
        connectPoolOnline('global_match_2v2', '2v2', '2v2_online');
      };
    }

    const btnCancel = document.getElementById('btnCancelOnline');
    if (btnCancel) {
      btnCancel.onclick = (e) => {
        e.stopPropagation();
        if (onlinePanel) onlinePanel.hidden = true;
        cancelMatchmaking();
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
