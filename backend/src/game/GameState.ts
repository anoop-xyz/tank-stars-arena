// Authoritative per-room game state machine. Owns terrain, tanks, turn order,
// the turn timer, weapon cooldowns, shot resolution, and win detection.

import {
  RoomState,
  TankState,
  PlayerId,
  ShotResult,
  ExplosionEvent,
  DamageEvent,
} from '../types';
import { MAX_HEALTH, TURN_SECONDS, WORLD_WIDTH } from '../constants';
import { generateTerrain, destroyTerrain, groundAt } from './terrain';
import { getWeapon, DEFAULT_WEAPON_ID, WEAPON_IDS } from './weapons';
import { simulateShot } from './physics';
import { resolveExplosion, ExplosionSpec } from './damage';

function makeTank(id: PlayerId, x: number, terrain: number[], facing: 1 | -1): TankState {
  return {
    id,
    socketId: null,
    connected: false,
    x,
    y: groundAt(terrain, x) - 20,
    angleDeg: facing === 1 ? 60 : 120,
    power: 50,
    health: MAX_HEALTH,
    armor: 0.1,
    facing,
    selectedWeaponId: DEFAULT_WEAPON_ID,
    weaponCooldowns: {},
  };
}

export class GameState {
  state: RoomState;
  private rng: () => number;

  constructor(code: string, seed = Math.floor(Math.random() * 1e9)) {
    const terrain = generateTerrain(seed);
    const p1x = Math.floor(WORLD_WIDTH * 0.15);
    const p2x = Math.floor(WORLD_WIDTH * 0.85);
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.state = {
      code,
      phase: 'waiting',
      terrain,
      tanks: {
        p1: makeTank('p1', p1x, terrain, 1),
        p2: makeTank('p2', p2x, terrain, -1),
      },
      currentTurn: 'p1',
      turnEndsAt: null,
      winner: null,
      seed,
    };
  }

  /** Coin toss to decide who starts, then begin the first turn. */
  startMatch(): PlayerId {
    this.state.phase = 'coinToss';
    const first: PlayerId = this.rng() < 0.5 ? 'p1' : 'p2';
    this.state.currentTurn = first;
    this.beginTurn();
    return first;
  }

  beginTurn(): void {
    this.state.phase = 'playing';
    this.state.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
    // Tick down cooldowns for the player about to act.
    const t = this.state.tanks[this.state.currentTurn];
    for (const w of Object.keys(t.weaponCooldowns)) {
      if (t.weaponCooldowns[w] > 0) t.weaponCooldowns[w]--;
    }
    // Ensure tanks rest on the (possibly changed) terrain surface.
    this.settleTanks();
  }

  /** Drop tanks onto the terrain surface (called after terrain changes). */
  settleTanks(): void {
    for (const id of ['p1', 'p2'] as PlayerId[]) {
      const tank = this.state.tanks[id];
      const ground = groundAt(this.state.terrain, tank.x);
      tank.y = ground - 20;
    }
  }

  private otherPlayer(id: PlayerId): PlayerId {
    return id === 'p1' ? 'p2' : 'p1';
  }

  canFire(player: PlayerId, weaponId: string): boolean {
    if (this.state.phase !== 'playing') return false;
    if (this.state.currentTurn !== player) return false;
    const tank = this.state.tanks[player];
    if ((tank.weaponCooldowns[weaponId] ?? 0) > 0) return false;
    return WEAPON_IDS.includes(weaponId);
  }

  /**
   * Resolve a fired shot authoritatively: simulate flight, carve terrain,
   * apply damage, set cooldown, swap turn, and detect a winner.
   */
  resolveFire(
    player: PlayerId,
    angleDeg: number,
    power: number,
    weaponId: string,
  ): ShotResult {
    const weapon = getWeapon(weaponId);
    const shooter = this.state.tanks[player];
    shooter.angleDeg = angleDeg;
    shooter.power = power;
    shooter.selectedWeaponId = weaponId;
    this.state.phase = 'resolving';

    const sim = simulateShot(shooter, angleDeg, power, weapon, this.state.terrain, this.state.tanks);

    const explosions: ExplosionEvent[] = [];
    const damageEvents: DamageEvent[] = [];

    for (const impact of sim.impacts) {
      // Carve terrain at each impact.
      destroyTerrain(this.state.terrain, impact.point.x, impact.point.y, weapon.explosionRadius);
      explosions.push({
        x: impact.point.x,
        y: impact.point.y,
        radius: weapon.explosionRadius,
        weaponId: weapon.id,
        big: weapon.big,
      });
      const spec: ExplosionSpec = {
        x: impact.point.x,
        y: impact.point.y,
        radius: weapon.explosionRadius,
        weapon,
        directTarget: impact.hitTank,
      };
      damageEvents.push(...resolveExplosion(spec, this.state.tanks, this.rng));
    }

    // Terrain changed: tanks may need to fall to the new surface.
    this.settleTanks();

    // Apply cooldown for the weapon just used.
    if (weapon.cooldownTurns > 0) {
      shooter.weaponCooldowns[weaponId] = weapon.cooldownTurns;
    }

    // Win detection.
    const winner = this.detectWinner();
    let nextTurn = this.state.currentTurn;
    if (winner) {
      this.state.phase = 'ended';
      this.state.winner = winner;
      this.state.turnEndsAt = null;
    } else {
      nextTurn = this.otherPlayer(player);
      this.state.currentTurn = nextTurn;
      this.beginTurn();
    }

    return {
      shooter: player,
      weaponId: weapon.id,
      origin: { x: shooter.x, y: shooter.y },
      trajectory: sim.trajectory,
      impact: sim.impacts[0]?.point ?? null,
      explosions,
      terrain: this.state.terrain,
      damageEvents,
      tanks: this.state.tanks,
      nextTurn,
      winner,
      phase: this.state.phase,
    };
  }

  /** Build a weak randomized shot when a player's timer expires. */
  autoShot(player: PlayerId): { angleDeg: number; power: number; weaponId: string } {
    const tank = this.state.tanks[player];
    const angleDeg = tank.facing === 1 ? 45 + this.rng() * 30 : 105 + this.rng() * 30;
    const power = 25 + this.rng() * 20; // deliberately weak
    return { angleDeg, power, weaponId: DEFAULT_WEAPON_ID };
  }

  private detectWinner(): PlayerId | null {
    const p1Dead = this.state.tanks.p1.health <= 0;
    const p2Dead = this.state.tanks.p2.health <= 0;
    if (p1Dead && p2Dead) return this.state.currentTurn; // tie -> shooter wins
    if (p1Dead) return 'p2';
    if (p2Dead) return 'p1';
    return null;
  }
}

// Local PRNG copy so GameState is self-contained.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
