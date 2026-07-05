// Lightweight typed event bus bridging the Phaser world and React HUD. Phaser
// emits gameplay events (health/turn/timer changes); React emits player input
// (fire, select weapon). A single shared emitter keeps the two layers decoupled.

import Phaser from 'phaser';

export interface HudState {
  p1Health: number;
  p2Health: number;
  currentTurn: 'p1' | 'p2';
  isMyTurn: boolean;
  timeLeft: number;
  power: number;
  angleDeg: number;
  selectedWeaponId: string;
  cooldowns: Record<string, number>;
  phase: string;
}

export const EventBus = new Phaser.Events.EventEmitter();

// Event name constants to avoid stringly-typed bugs.
export const EVT = {
  HUD_UPDATE: 'hud:update',       // Phaser -> React
  SET_POWER: 'input:power',       // React -> Phaser
  SET_ANGLE: 'input:angle',       // React -> Phaser
  SELECT_WEAPON: 'input:weapon',  // React -> Phaser
  FIRE: 'input:fire',             // React -> Phaser
  PAUSE: 'input:pause',           // React -> Phaser
} as const;
