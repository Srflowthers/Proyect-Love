/**
 * ============================================================================
 * MODO ONLINE - INFRAESTRUCTURA PREPARADA PARA MULTIJUGADOR (STUB)
 * ============================================================================
 * Carpeta: modes/online-stub.js
 * Aquí se conectará el WebSocket / WebRTC / Firebase Realtime en la siguiente fase.
 */

export class TetrisOnline {
  constructor() {
    this.roomId = null;
    this.connected = false;
  }

  connect(roomId) {
    console.log('[TetrisOnline] Preparado para conectar a sala:', roomId);
  }

  sendBoardState(state) {
    // Para enviar el estado de la matriz y líneas al rival en la nube
  }
}
