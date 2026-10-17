/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - GOMINOLA
 * -------------------------------------------------------------
 * Archivo modular e independiente para calcular y enviar
 * las monedas y LP ganados por ronda sin ensuciar el motor de juego.
 */

window.GOMI_REWARD_CONFIG = {
  // Monedas
  COINS_RATE_PER_MINUTE: 2.5,
  COINS_MIN_PER_ROUND: 1,
  MAX_MINUTES_COUNTED: 25,
  WIN_FACTOR: 1.0,
  LOSS_FACTOR: 0.6,
  STREAK_BONUS_STEP: 0.1,
  MAX_STREAK_BONUS_MULT: 5,

  // Puntos de Liga (LP) según rango de rondas
  // Rondas 1-5: ~10-18 LP | Rondas 10-20: ~25-45 LP | Rondas 30+: ~60-75 LP
  getLpForRound: function (roundNo, win, perfRatio) {
    if (!win) return 0;
    const base = roundNo <= 5 ? (10 + roundNo * 1.5) :
                 roundNo <= 15 ? (18 + (roundNo - 5) * 2.2) :
                 roundNo <= 30 ? (40 + (roundNo - 15) * 1.8) :
                 Math.min(85, 68 + (roundNo - 30) * 0.7);
    const perfMult = Math.min(1.25, Math.max(0.85, perfRatio || 1));
    return Math.max(1, Math.round(base * perfMult));
  }
};

/**
 * Calcula monedas y LP ganados y los envía al frontend (Firebase/perfil)
 * @param {Object} data
 * @param {number} data.score - Puntaje obtenido en la ronda
 * @param {number} data.target - Meta requerida
 * @param {boolean} data.win - Si alcanzó la meta
 * @param {number} data.streak - Racha de victorias actual
 * @param {number} data.round - Número de ronda actual
 * @param {number} [data.durationMs] - Tiempo que tomó la ronda en ms
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaGomi = function (data) {
  const cfg = window.GOMI_REWARD_CONFIG;
  const score = Number(data.score) || 0;
  const target = Number(data.target) || 0;
  const win = Boolean(data.win);
  const streak = Number(data.streak) || 0;
  const roundNo = Number(data.round) || 1;
  const durationMs = Number(data.durationMs) || 120000;

  // 1. Cálculo de monedas
  const minutes = Math.min(durationMs / 60000, cfg.MAX_MINUTES_COUNTED);
  const perfRatio = target > 0 ? (score / target) : 1;
  const multGomi = Math.min(1.5, Math.max(0.3, perfRatio));
  const winFactor = win ? cfg.WIN_FACTOR : cfg.LOSS_FACTOR;
  const streakBonus = 1 + cfg.STREAK_BONUS_STEP * Math.min(streak, cfg.MAX_STREAK_BONUS_MULT);
  const earnedCoins = Math.max(cfg.COINS_MIN_PER_ROUND, Math.round(cfg.COINS_RATE_PER_MINUTE * minutes * multGomi * winFactor * streakBonus));

  // 2. Cálculo de LP
  const lpAward = cfg.getLpForRound(roundNo, win, perfRatio);

  // 3. Enviar al contenedor (GamesView -> Firebase)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'gomi',
        coins: earnedCoins,
        score: score,
        target: target,
        win: win,
        streak: streak,
        lpDelta: lpAward,
        round: roundNo
      }, '*');
    }
  } catch (err) {
    console.error('[GomiReward] Error enviando postMessage:', err);
  }

  return { earnedCoins, lpAward };
};
