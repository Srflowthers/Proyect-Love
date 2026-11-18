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

  // Puntos de Liga / ELO (LP) al finalizar la partida (al morir)
  // Basado en etapas superadas, minutos sobrevividos y rendimiento
  getLpForRound: function (roundNo, win, perfRatio, stagesCleared, durationMs) {
    const stages = typeof stagesCleared === 'number' ? stagesCleared : (win ? 1 : 0);
    const mins = Math.min(10, Math.max(0.2, (durationMs || 60000) / 60000));
    if (stages <= 0 && !win && (perfRatio || 0) < 0.65) {
      return 0;
    }
    const stageBase = stages * 6 + Math.min(25, Math.round(mins * 4.5));
    const levelBonus = Math.min(35, Math.round(roundNo * 0.45));
    const perfMult = Math.min(1.3, Math.max(0.75, perfRatio || 1));
    return Math.max(2, Math.round((stageBase + levelBonus) * perfMult));
  }
};

/**
 * Calcula monedas (Oro) y ELO (LP) ganados al morir / terminar la partida y los envía al frontend
 * @param {Object} data
 * @param {number} data.score - Puntaje total acumulado en la partida
 * @param {number} data.target - Meta acumulada de referencia
 * @param {boolean} data.win - Si superó al menos 1 etapa o meta de partida
 * @param {number} data.streak - Racha / etapas superadas en la partida
 * @param {number} data.round - Nivel / etapa alcanzada
 * @param {number} [data.stagesCleared] - Cantidad de etapas completadas antes de morir
 * @param {number} [data.durationMs] - Tiempo total sobrevivido en la partida en ms
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaGomi = function (data) {
  const cfg = window.GOMI_REWARD_CONFIG;
  const score = Number(data.score) || 0;
  const target = Math.max(500, Number(data.target) || 1000);
  const stagesCleared = Number(data.stagesCleared) || 0;
  const win = Boolean(data.win) || stagesCleared >= 1;
  const streak = Number(data.streak) || stagesCleared;
  const roundNo = Number(data.round) || 1;
  const durationMs = Number(data.durationMs) || 60000;

  // 1. Cálculo de Oro (monedas) al morir según tiempo sobrevivido, etapas y puntaje
  const minutes = Math.max(0.35, Math.min(durationMs / 60000, cfg.MAX_MINUTES_COUNTED));
  const perfRatio = target > 0 ? (score / target) : 1;
  const multGomi = Math.min(1.6, Math.max(0.4, perfRatio));
  const winFactor = win ? cfg.WIN_FACTOR : cfg.LOSS_FACTOR;
  const streakBonus = 1 + cfg.STREAK_BONUS_STEP * Math.min(streak, cfg.MAX_STREAK_BONUS_MULT);
  const stageCoinBonus = Number(data.bonusCoins) || Math.floor(stagesCleared * 1.5);
  const earnedCoins = Math.max(
    cfg.COINS_MIN_PER_ROUND,
    Math.round(cfg.COINS_RATE_PER_MINUTE * minutes * multGomi * winFactor * streakBonus) + stageCoinBonus
  );

  // 2. Cálculo de ELO / LP (incluye el bono ganado por la dificultad de cada etapa superada)
  const bonusElo = Number(data.bonusElo) || 0;
  const lpAward = cfg.getLpForRound(roundNo, win, perfRatio, stagesCleared, durationMs) + bonusElo;

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
