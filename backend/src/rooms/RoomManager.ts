// Room lifecycle manager. Owns the map of active rooms, generates unique
// 6-digit codes, and handles join / disconnect / reconnect / cleanup.

import { GameState } from '../game/GameState';
import { PlayerId } from '../types';

export interface Room {
  code: string;
  game: GameState;
  createdAt: number;
  turnTimer: NodeJS.Timeout | null;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  // Map socketId -> { code, playerId } for quick disconnect lookups.
  private sockets = new Map<string, { code: string; playerId: PlayerId }>();

  private generateCode(): string {
    let code: string;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socketId: string): Room {
    const code = this.generateCode();
    const game = new GameState(code);
    game.state.tanks.p1.socketId = socketId;
    game.state.tanks.p1.connected = true;
    const room: Room = { code, game, createdAt: Date.now(), turnTimer: null };
    this.rooms.set(code, room);
    this.sockets.set(socketId, { code, playerId: 'p1' });
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Attempt to join an existing room as player 2. Returns null on failure. */
  joinRoom(code: string, socketId: string): { room: Room; playerId: PlayerId } | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const p2 = room.game.state.tanks.p2;
    if (p2.connected) return null; // room full
    p2.socketId = socketId;
    p2.connected = true;
    this.sockets.set(socketId, { code, playerId: 'p2' });
    return { room, playerId: 'p2' };
  }

  /** Look up which room/player a socket belongs to. */
  lookupSocket(socketId: string) {
    return this.sockets.get(socketId);
  }

  /**
   * Handle a disconnect. Marks the player disconnected but keeps the room alive
   * for a grace period so they can reconnect. Returns room + player for notify.
   */
  handleDisconnect(socketId: string): { room: Room; playerId: PlayerId } | null {
    const entry = this.sockets.get(socketId);
    if (!entry) return null;
    const room = this.rooms.get(entry.code);
    this.sockets.delete(socketId);
    if (!room) return null;
    const tank = room.game.state.tanks[entry.playerId];
    tank.connected = false;
    tank.socketId = null;
    return { room, playerId: entry.playerId };
  }

  /** Reconnect a returning player to their slot by room code + player id. */
  reconnect(code: string, playerId: PlayerId, socketId: string): Room | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const tank = room.game.state.tanks[playerId];
    if (tank.connected) return null; // slot already taken by a live socket
    tank.socketId = socketId;
    tank.connected = true;
    this.sockets.set(socketId, { code, playerId });
    return room;
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room?.turnTimer) clearTimeout(room.turnTimer);
    this.rooms.delete(code);
  }

  /** Periodic cleanup of stale/empty rooms (both players gone). */
  sweep(maxAgeMs = 1000 * 60 * 30): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const { p1, p2 } = room.game.state.tanks;
      const empty = !p1.connected && !p2.connected;
      const stale = now - room.createdAt > maxAgeMs;
      if (empty || stale) this.deleteRoom(code);
    }
  }
}
