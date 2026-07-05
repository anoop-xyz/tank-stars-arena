// Entry point: Express health endpoint + Socket.IO authoritative game server.
// Clients send intents (create/join/aim/fire); the server resolves everything
// and broadcasts authoritative results. No game-deciding logic trusts the client.

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { RoomManager, Room } from './rooms/RoomManager';
import { getWeapon } from './game/weapons';
import { AimIntent, FireIntent, PlayerId } from './types';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } });

const rooms = new RoomManager();
setInterval(() => rooms.sweep(), 60_000);

/** Broadcast the full authoritative room state to everyone in the room. */
function emitState(room: Room): void {
  io.to(room.code).emit('state', room.game.state);
}

/** Arm the server-side turn timer. On expiry, fire a weak auto-shot. */
function armTurnTimer(room: Room): void {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  const { turnEndsAt, currentTurn } = room.game.state;
  if (!turnEndsAt) return;
  const delay = Math.max(0, turnEndsAt - Date.now());
  room.turnTimer = setTimeout(() => {
    if (room.game.state.phase !== 'playing') return;
    const shot = room.game.autoShot(currentTurn);
    const result = room.game.resolveFire(currentTurn, shot.angleDeg, shot.power, shot.weaponId);
    io.to(room.code).emit('shotResult', { ...result, auto: true });
    emitState(room);
    if (room.game.state.phase === 'playing') armTurnTimer(room);
  }, delay);
}

function beginMatchIfReady(room: Room): void {
  const { p1, p2 } = room.game.state.tanks;
  if (p1.connected && p2.connected && room.game.state.phase === 'waiting') {
    const first = room.game.startMatch();
    io.to(room.code).emit('matchStart', { first, state: room.game.state });
    emitState(room);
    armTurnTimer(room);
  }
}

io.on('connection', (socket: Socket) => {
  // --- Room creation ---
  socket.on('createRoom', () => {
    const room = rooms.createRoom(socket.id);
    socket.join(room.code);
    socket.emit('roomCreated', { code: room.code, playerId: 'p1', state: room.game.state });
  });

  // --- Room joining ---
  socket.on('joinRoom', (code: string) => {
    const result = rooms.joinRoom(String(code).trim(), socket.id);
    if (!result) {
      socket.emit('joinError', { message: 'Room not found or already full.' });
      return;
    }
    socket.join(result.room.code);
    socket.emit('roomJoined', {
      code: result.room.code,
      playerId: result.playerId,
      state: result.room.game.state,
    });
    io.to(result.room.code).emit('playerJoined', { playerId: result.playerId });
    beginMatchIfReady(result.room);
  });

  // --- Reconnect ---
  socket.on('reconnectRoom', ({ code, playerId }: { code: string; playerId: PlayerId }) => {
    const room = rooms.reconnect(String(code).trim(), playerId, socket.id);
    if (!room) {
      socket.emit('joinError', { message: 'Could not reconnect to room.' });
      return;
    }
    socket.join(room.code);
    socket.emit('reconnected', { code: room.code, playerId, state: room.game.state });
    io.to(room.code).emit('playerReconnected', { playerId });
  });

  // --- Aim intent (broadcast so opponent sees live cannon movement) ---
  socket.on('aim', (intent: AimIntent) => {
    const entry = rooms.lookupSocket(socket.id);
    if (!entry) return;
    const room = rooms.getRoom(entry.code);
    if (!room) return;
    if (room.game.state.currentTurn !== entry.playerId) return; // only active player
    const tank = room.game.state.tanks[entry.playerId];
    tank.angleDeg = Math.max(0, Math.min(180, intent.angleDeg));
    tank.power = Math.max(0, Math.min(100, intent.power));
    tank.selectedWeaponId = intent.weaponId;
    socket.to(room.code).emit('opponentAim', {
      playerId: entry.playerId,
      angleDeg: tank.angleDeg,
      power: tank.power,
      weaponId: tank.selectedWeaponId,
    });
  });

  // --- Fire intent (server resolves authoritatively) ---
  socket.on('fire', (intent: FireIntent) => {
    const entry = rooms.lookupSocket(socket.id);
    if (!entry) return;
    const room = rooms.getRoom(entry.code);
    if (!room) return;
    const weaponId = intent.weaponId ?? room.game.state.tanks[entry.playerId].selectedWeaponId;
    if (!room.game.canFire(entry.playerId, weaponId)) {
      socket.emit('fireRejected', { reason: 'Not your turn or weapon on cooldown.' });
      return;
    }
    if (room.turnTimer) clearTimeout(room.turnTimer);
    const angle = Math.max(0, Math.min(180, intent.angleDeg));
    const power = Math.max(0, Math.min(100, intent.power));
    const result = room.game.resolveFire(entry.playerId, angle, power, weaponId);
    io.to(room.code).emit('shotResult', { ...result, auto: false });
    emitState(room);
    if (room.game.state.phase === 'playing') armTurnTimer(room);
  });

  // --- Weapon selection (no turn cost, just UI sync) ---
  socket.on('selectWeapon', (weaponId: string) => {
    const entry = rooms.lookupSocket(socket.id);
    if (!entry) return;
    const room = rooms.getRoom(entry.code);
    if (!room) return;
    const weapon = getWeapon(weaponId);
    room.game.state.tanks[entry.playerId].selectedWeaponId = weapon.id;
    socket.to(room.code).emit('opponentWeapon', { playerId: entry.playerId, weaponId: weapon.id });
  });

  // --- Rematch ---
  socket.on('playAgain', () => {
    const entry = rooms.lookupSocket(socket.id);
    if (!entry) return;
    const room = rooms.getRoom(entry.code);
    if (!room) return;
    // Rebuild the game while preserving socket bindings.
    const p1Socket = room.game.state.tanks.p1.socketId;
    const p2Socket = room.game.state.tanks.p2.socketId;
    const fresh = new (room.game.constructor as typeof import('./game/GameState').GameState)(room.code);
    fresh.state.tanks.p1.socketId = p1Socket;
    fresh.state.tanks.p1.connected = !!p1Socket;
    fresh.state.tanks.p2.socketId = p2Socket;
    fresh.state.tanks.p2.connected = !!p2Socket;
    room.game = fresh;
    beginMatchIfReady(room);
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    const res = rooms.handleDisconnect(socket.id);
    if (!res) return;
    io.to(res.room.code).emit('playerDisconnected', { playerId: res.playerId });
    if (res.room.turnTimer) clearTimeout(res.room.turnTimer);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tank Stars Arena server listening on :${PORT}`);
});
