// Thin typed wrapper around the Socket.IO client. A singleton so both React UI
// and the Phaser game read/write the same connection. Emits are 'intents'; the
// server owns all authoritative outcomes.

import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '@/constants/config';
import { RoomState, ShotResult, PlayerId } from '@/types/game';

type Handler<T> = (payload: T) => void;

export class SocketManager {
  private static _instance: SocketManager;
  socket: Socket;
  playerId: PlayerId | null = null;
  roomCode: string | null = null;

  private constructor() {
    this.socket = io(SERVER_URL, { autoConnect: true, transports: ['websocket'] });
  }

  static get instance(): SocketManager {
    if (!this._instance) this._instance = new SocketManager();
    return this._instance;
  }

  // --- Intent emitters ---
  createRoom() { this.socket.emit('createRoom'); }
  joinRoom(code: string) { this.socket.emit('joinRoom', code); }
  reconnectRoom(code: string, playerId: PlayerId) { this.socket.emit('reconnectRoom', { code, playerId }); }
  aim(angleDeg: number, power: number, weaponId: string) { this.socket.emit('aim', { angleDeg, power, weaponId }); }
  fire(angleDeg: number, power: number, weaponId: string) { this.socket.emit('fire', { angleDeg, power, weaponId }); }
  selectWeapon(weaponId: string) { this.socket.emit('selectWeapon', weaponId); }
  playAgain() { this.socket.emit('playAgain'); }

  // --- Typed listeners (return an unsubscribe fn) ---
  on<T>(event: string, handler: Handler<T>): () => void {
    this.socket.on(event, handler as (...args: unknown[]) => void);
    return () => this.socket.off(event, handler as (...args: unknown[]) => void);
  }

  onRoomCreated(cb: Handler<{ code: string; playerId: PlayerId; state: RoomState }>) {
    return this.on('roomCreated', (p: { code: string; playerId: PlayerId; state: RoomState }) => {
      this.playerId = p.playerId; this.roomCode = p.code; cb(p);
    });
  }
  onRoomJoined(cb: Handler<{ code: string; playerId: PlayerId; state: RoomState }>) {
    return this.on('roomJoined', (p: { code: string; playerId: PlayerId; state: RoomState }) => {
      this.playerId = p.playerId; this.roomCode = p.code; cb(p);
    });
  }
  onMatchStart(cb: Handler<{ first: PlayerId; state: RoomState }>) { return this.on('matchStart', cb); }
  onState(cb: Handler<RoomState>) { return this.on('state', cb); }
  onShotResult(cb: Handler<ShotResult>) { return this.on('shotResult', cb); }
  onJoinError(cb: Handler<{ message: string }>) { return this.on('joinError', cb); }
  onPlayerJoined(cb: Handler<{ playerId: PlayerId }>) { return this.on('playerJoined', cb); }
  onPlayerDisconnected(cb: Handler<{ playerId: PlayerId }>) { return this.on('playerDisconnected', cb); }
  onPlayerReconnected(cb: Handler<{ playerId: PlayerId }>) { return this.on('playerReconnected', cb); }
  onOpponentAim(cb: Handler<{ playerId: PlayerId; angleDeg: number; power: number; weaponId: string }>) {
    return this.on('opponentAim', cb);
  }
}

export const socketManager = SocketManager.instance;
