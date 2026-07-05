// Client mirror of the server wire protocol. Kept in sync with backend/src/types.ts.

export type PlayerId = 'p1' | 'p2';

export interface Vec2 { x: number; y: number; }

export interface TankState {
  id: PlayerId;
  socketId: string | null;
  connected: boolean;
  x: number;
  y: number;
  angleDeg: number;
  power: number;
  health: number;
  armor: number;
  facing: 1 | -1;
  selectedWeaponId: string;
  weaponCooldowns: Record<string, number>;
}

export type GamePhase = 'waiting' | 'coinToss' | 'playing' | 'resolving' | 'ended';

export interface RoomState {
  code: string;
  phase: GamePhase;
  terrain: number[];
  tanks: Record<PlayerId, TankState>;
  currentTurn: PlayerId;
  turnEndsAt: number | null;
  winner: PlayerId | null;
  seed: number;
}

export interface ExplosionEvent {
  x: number; y: number; radius: number; weaponId: string; big: boolean;
}

export interface DamageEvent {
  target: PlayerId; amount: number; critical: boolean; directHit: boolean; x: number; y: number;
}

export interface ShotResult {
  shooter: PlayerId;
  weaponId: string;
  origin: Vec2;
  trajectory: Vec2[];
  impact: Vec2 | null;
  explosions: ExplosionEvent[];
  terrain: number[];
  damageEvents: DamageEvent[];
  tanks: Record<PlayerId, TankState>;
  nextTurn: PlayerId;
  winner: PlayerId | null;
  phase: GamePhase;
  auto?: boolean;
}
