/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - ROMPECABEZAS (PUZZLE)
 * -------------------------------------------------------------
 * Archivo modular e independiente para calcular y enviar
 * las monedas y LP ganados al completar el rompecabezas sin ensuciar el motor de juego.
 */

window.PUZZLE_REWARD_CONFIG = {
  // Puntos de Liga (LP) según número de piezas (N)
  puzzleLpMap: { 30: 15, 60: 40, 120: 80, 240: 250, 500: 350 },
  calcLp: function (pieces) {
    return this.puzzleLpMap[pieces] || (pieces >= 240 ? 250 : pieces >= 120 ? 80 : pieces >= 60 ? 40 : 15);
  },

  // Monedas según tiempo y multiplicador de piezas
  pieceMultMap: { 30: 0.6, 60: 0.8, 120: 1.0, 240: 1.6, 500: 2.8 },
  calcCoins: function (pieces, minutes) {
    const mult = this.pieceMultMap[pieces] || 1.0;
    return Math.max(3, Math.round(2.5 * Math.max(1, minutes) * mult));
  }
};

/**
 * Calcula monedas y LP de Rompecabezas y los envía a Firebase
 * @param {Object} data
 * @param {number} data.pieces - Cantidad de piezas del rompecabezas (N)
 * @param {number} [data.durationMs] - Tiempo que tomó resolverlo
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaPuzzle = function (data) {
  const cfg = window.PUZZLE_REWARD_CONFIG;
  const pieces = Number(data.pieces) || 30;
  const durationMs = Number(data.durationMs) || 60000;
  const minutes = Math.min(durationMs / 60000, 60);

  // 1. Cálculo de monedas
  const earnedCoins = cfg.calcCoins(pieces, minutes);

  // 2. Cálculo de LP
  const lpAward = cfg.calcLp(pieces);

  // 3. Enviar a GamesView -> Firebase
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'puzzle',
        coins: earnedCoins,
        score: pieces,
        lpDelta: lpAward
      }, '*');
    }
  } catch (err) {
    console.error('[PuzzleReward] Error enviando postMessage:', err);
  }

  return { earnedCoins, lpAward };
};
