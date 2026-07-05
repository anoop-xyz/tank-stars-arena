// Shared server-side type definitions for Tank Stars Arena.
// These mirror the payloads exchanged over Socket.IO. Keeping them in one place
// makes the wire protocol explicit and easy to evolve.

export type PlayerId = 'p1' | 'p2';

export interface Vec2 {
  x: number;
  y: number;
}

/** A single player's authoritative state. */
export interface TankState {
  id: PlayerId;
  socketId: string | null; // null while disconnected (awaiting reconnect)
  connected: boolean;
  x: number;
  y: number;
  angleDeg: number;   // turret angle, 0..180 (0 = facing right, 180 = facing left)
  power: number;      // 0..100
  health: number;     // 0..MAX_HEALTH
  armor: number;      // flat damage reduction fraction 0..1
  facing: 1 | -1;     // 1 = right, -1 = left
  selectedWeaponId: string;
  weaponCooldowns: Record<string, number>; // weaponId -> turns remaining
}

export type GamePhase =
  | 'waiting'   // room created, awaiting 2nd player
  | 'coinToss'  // deciding first turn
  | 'playing'   // an active turn is in progress
  | 'resolving' // projectile in flight / explosion resolving
  | 'ended';    // winner decided

export interface RoomState {
  code: string;
  phase: GamePhase;
  terrain: number[];        // heightmap: terrain[x] = ground height (screen y)
  tanks: Record<PlayerId, TankState>;
  currentTurn: PlayerId;
  turnEndsAt: number | null; // epoch ms when the current turn auto-fires
  winner: PlayerId | null;
  seed: number;
}

/** Client -> server: player intents only (never authoritative facts). */
export interface AimIntent {
  angleDeg: number;
  power: number;
  weaponId: string;
}

export interface FireIntent {
  angleDeg: number;
  power: number;
  weaponId: string;
}

/** Server -> client: the resolved outcome of a fired shot. */
export interface ShotResult {
  shooter: PlayerId;
  weaponId: string;
  origin: Vec2;
  // Full sampled trajectory so clients can render identical flight paths.
  trajectory: Vec2[];
  impact: Vec2 | null;
  explosions: ExplosionEvent[];
  terrain: number[];        // updated heightmap after destruction
  damageEvents: DamageEvent[];
  tanks: Record<PlayerId, TankState>;
  nextTurn: PlayerId;
  winner: PlayerId | null;
  phase: GamePhase;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  radius: number;
  weaponId: string;
  big: boolean; // triggers screen flash on client
}

export interface DamageEvent {
  target: PlayerId;
  amount: number;
  critical: boolean;
  directHit: boolean;
  x: number;
  y: number;
}
