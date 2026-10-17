/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - POOL (BILLAR)
 * -------------------------------------------------------------
 * Archivo modular e independiente para calcular y enviar
 * las monedas y LP ganados en las partidas de billar sin ensuciar el motor de juego.
 */

window.POOL_REWARD_CONFIG = {
  // Monedas
  BASE_WIN_COINS: 12,
  BASE_LOSS_COINS: 4,
  TIME_RATE_PER_MINUTE: 1.5,
  MAX_COINS: 45,

  // Puntos de Liga (LP)
  // Calibrado a partidas de 5-10 minutos:
  // Victoria legal bola 8: 65 - 90 LP
  // Derrota / falta en la 8: 15 - 25 LP
  calcLp: function (win, minutes) {
    if (win) {
      return Math.min(110, Math.round(65 + Math.min(minutes * 3, 30)));
    }
    return Math.max(10, Math.round(15 + Math.min(minutes * 1.5, 15)));
  }
};

/**
 * Calcula monedas y LP de Pool y los envía a Firebase
 * @param {Object} data
 * @param {boolean} data.win - Si el jugador ganó legalmente
 * @param {number} [data.durationMs] - Duración de la partida en ms
 * @param {number} [data.score] - Bolas embocadas o puntuación
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaPool = function (data) {
  const cfg = window.POOL_REWARD_CONFIG;
  const win = Boolean(data.win);
  const durationMs = Number(data.durationMs) || 180000;
  const score = Number(data.score) || (win ? 1 : 0);
  const minutes = Math.min(durationMs / 60000, 30);

  // 1. Cálculo de monedas
  const base = win ? cfg.BASE_WIN_COINS : cfg.BASE_LOSS_COINS;
  const timeBonus = Math.round(minutes * cfg.TIME_RATE_PER_MINUTE);
  const earnedCoins = Math.min(cfg.MAX_COINS, base + timeBonus);

  // 2. Cálculo de LP
  const lpAward = cfg.calcLp(win, minutes);

  // 3. Enviar a GamesView -> Firebase
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'pool',
        coins: earnedCoins,
        score: score,
        win: win,
        lpDelta: lpAward
      }, '*');
    }
  } catch (err) {
    console.error('[PoolReward] Error enviando postMessage:', err);
  }

  return { earnedCoins, lpAward };
};
