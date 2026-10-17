/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - SUDOKU
 * -------------------------------------------------------------
 * Archivo modular e independiente para calcular y enviar
 * las monedas y LP ganados al completar el Sudoku sin ensuciar el motor de juego.
 */

window.SUDOKU_REWARD_CONFIG = {
  // Monedas según tamaño N
  coinBaseMap: { 6: 6, 9: 16, 12: 36 },
  TIME_BONUS_FACTOR: 0.8,
  MAX_TIME_BONUS_COINS: 8,

  // Puntos de Liga (LP) según tamaño de cuadrícula
  sudokuLpMap: { 6: 20, 9: 55, 12: 120 },
  calcLp: function (gridSize) {
    return this.sudokuLpMap[gridSize] || (gridSize >= 12 ? 120 : gridSize >= 9 ? 55 : 20);
  }
};

/**
 * Calcula monedas y LP de Sudoku y los envía a Firebase
 * @param {Object} data
 * @param {number} data.score - Puntaje total o casillas resueltas
 * @param {number} data.durationMs - Tiempo en resolver el sudoku en ms
 * @param {number} [data.moves] - Número de movimientos / turnos
 * @returns {{ earnedCoins: number, lpAward: number }}
 */
window.enviarRecompensaSudoku = function (data) {
  const cfg = window.SUDOKU_REWARD_CONFIG;
  const score = Number(data.score) || 81;
  const durationMs = Number(data.durationMs) || 180000;
  const gridSize = Number(data.gridSize) || 9;
  const minutes = Math.min(durationMs / 60000, 30);

  // 1. Cálculo de monedas
  const baseCoins = cfg.coinBaseMap[gridSize] || 10;
  const timeBonusCoins = Math.min(cfg.MAX_TIME_BONUS_COINS, Math.round(minutes * cfg.TIME_BONUS_FACTOR));
  const earnedCoins = baseCoins + timeBonusCoins;

  // 2. Cálculo de LP
  const lpAward = cfg.calcLp(gridSize);

  // 3. Enviar a GamesView -> Firebase
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'sudoku',
        coins: earnedCoins,
        score: score,
        lpDelta: lpAward
      }, '*');
    }
  } catch (err) {
    console.error('[SudokuReward] Error enviando postMessage:', err);
  }

  return { earnedCoins, lpAward };
};
