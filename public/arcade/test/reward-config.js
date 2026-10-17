/**
 * RECOMPENSAS Y PUNTOS DE LIGA (LP) - TEST
 * -------------------------------------------------------------
 * Configuración de prueba: +1 LP y +1 Moneda por pulsación
 */

window.TEST_REWARD_CONFIG = {
  COINS_PER_CLICK: 1,
  LP_PER_CLICK: 1
};

window.enviarRecompensaTest = function (data) {
  const coins = window.TEST_REWARD_CONFIG.COINS_PER_CLICK;
  const lp = window.TEST_REWARD_CONFIG.LP_PER_CLICK;

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ARCADE_ROUND_COMPLETE',
        game: 'test',
        coins: coins,
        score: (data && data.clicks) || 1,
        lpDelta: lp
      }, '*');
    }
  } catch (err) {
    console.error('[TestReward] Error:', err);
  }

  return { earnedCoins: coins, lpAward: lp };
};
