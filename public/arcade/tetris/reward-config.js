/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - TETRIS
 * -------------------------------------------------------------
 * Archivo modular e independiente para calcular y enviar
 * las monedas y LP ganados por partida sin ensuciar el motor de juego.
 */

window.TETRIS_REWARD_CONFIG = {
  // Monedas
  BASE_RATE_MINUTES: 1.8,
  SCORE_DIVISOR: 450,
  MIN_COINS: 2,
  MAX_COINS: 50,

  // Puntos de Liga (LP)
  // Calibrado a ~450-550 LP / hora según rendimiento y puntaje
  calcLp: function (score, minutes) {
    if (score < 1000) return Math.min(8, Math.max(1, Math.round(score / 150)));
    if (score < 5000) return 10 + Math.round((score - 1000) / 250);
    if (score < 15000) return 26 + Math.round((score - 5000) / 450);
    if (score < 35000) return 48 + Math.round((score - 15000) / 750);
    return Math.min(120, 75 + Math.round((score - 35000) / 1000));
  }
};

/**
 * Calcula monedas y LP ganados en Tetris y los envía a Firebase
 * @param {Object} data
 * @param {number} [data.score] - Puntaje total alcanzado
 * @param {number} [data.durationMs] - Duración de la partida en ms
 * @param {boolean} [data.win] - Si ganó la partida 1v1
 * @param {boolean} [data.abandon] - Si hubo abandono en 1v1
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaTetris = function (data) {
  const cfg = window.TETRIS_REWARD_CONFIG;
  const score = Number(data.score) || 0;
  const durationMs = Number(data.durationMs) || 60000;
  const minutes = Math.min(durationMs / 60000, 30);
  const win = data.win !== undefined ? Boolean(data.win) : null;
  const abandon = Boolean(data.abandon);

  // 1. Cálculo de monedas
  let earnedCoins = 0;
  if (abandon && win === false) {
    earnedCoins = 0;
  } else if (win === true) {
    earnedCoins = Math.min(cfg.MAX_COINS, Math.max(18, Math.round(15 + minutes * 1.5 + score / 500)));
  } else if (win === false) {
    earnedCoins = Math.min(cfg.MAX_COINS, Math.max(8, Math.round(6 + minutes * 1.0 + score / 800)));
  } else {
    const rawCoins = (minutes * cfg.BASE_RATE_MINUTES) + (score / cfg.SCORE_DIVISOR);
    earnedCoins = Math.max(cfg.MIN_COINS, Math.round(Math.min(cfg.MAX_COINS, rawCoins)));
  }

  // 2. Cálculo de LP
  let lpAward = 0;
  if (abandon && win === false) {
    lpAward = -35; // Sanción por abandono
  } else if (win === true) {
    lpAward = Math.min(110, Math.round(70 + Math.min(minutes * 3, 25) + Math.min(score / 400, 15)));
  } else if (win === false) {
    lpAward = Math.max(10, Math.round(18 + Math.min(minutes * 1.5, 12)));
  } else {
    lpAward = cfg.calcLp(score, minutes);
  }

  // 3. Enviar a GamesView -> Firebase
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'tetris',
        coins: earnedCoins,
        score: score,
        win: win,
        lpDelta: lpAward
      }, '*');
    }
  } catch (err) {
    console.error('[TetrisReward] Error enviando postMessage:', err);
  }

  return { earnedCoins, lpAward };
};
