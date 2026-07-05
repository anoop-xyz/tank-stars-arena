// Deterministic projectile simulation. Runs entirely on the server so hits and
// terrain destruction cannot be forged by a client. Uses a fixed timestep
// semi-implicit Euler integrator for stable, reproducible flight paths, and
// returns the full sampled trajectory so clients render the identical arc.

import {
  GRAVITY,
  SIM_STEP,
  MAX_SIM_TIME,
  MIN_LAUNCH_SPEED,
  MAX_LAUNCH_SPEED,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../constants';
import { WeaponConfig } from './weapons';
import { groundAt } from './terrain';
import { TankState, PlayerId, Vec2 } from '../types';

export interface SimHit {
  point: Vec2;
  hitTank: PlayerId | null;
}

export interface SimResult {
  trajectory: Vec2[];
  impacts: SimHit[]; // one per projectile (multi-shot weapons produce several)
}

/** Map a 0..100 power value to a launch speed in px/s. */
export function powerToSpeed(power: number): number {
  const t = Math.max(0, Math.min(100, power)) / 100;
  return MIN_LAUNCH_SPEED + t * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
}

function tankHit(tanks: Record<PlayerId, TankState>, x: number, y: number): PlayerId | null {
  // Tank bounding radius for collision purposes.
  const R = 34;
  for (const id of ['p1', 'p2'] as PlayerId[]) {
    const t = tanks[id];
    if (t.health <= 0) continue;
    const dx = x - t.x;
    const dy = y - t.y;
    if (dx * dx + dy * dy <= R * R) return id;
  }
  return null;
}

/**
 * Simulate a single projectile from origin with an initial velocity. Handles
 * gravity, terrain collision, tank collision, and bouncing weapons.
 */
function simulateOne(
  origin: Vec2,
  vx0: number,
  vy0: number,
  weapon: WeaponConfig,
  terrain: number[],
  tanks: Record<PlayerId, TankState>,
  sampleInto: Vec2[],
): SimHit {
  let x = origin.x;
  let y = origin.y;
  let vx = vx0;
  let vy = vy0;
  let bounces = weapon.bounces;
  const g = GRAVITY * weapon.gravityScale;
  let t = 0;
  let sampleAccumulator = 0;
  const sampleEvery = 1 / 60; // record a point ~every 16ms of sim time

  while (t < MAX_SIM_TIME) {
    vy += g * SIM_STEP;
    x += vx * SIM_STEP;
    y += vy * SIM_STEP;
    t += SIM_STEP;

    sampleAccumulator += SIM_STEP;
    if (sampleAccumulator >= sampleEvery) {
      sampleInto.push({ x, y });
      sampleAccumulator = 0;
    }

    // Out of horizontal bounds => shot leaves the field.
    if (x < 0 || x > WORLD_WIDTH) {
      return { point: { x, y }, hitTank: null };
    }

    // Direct tank collision.
    const hit = tankHit(tanks, x, y);
    if (hit) {
      sampleInto.push({ x, y });
      return { point: { x, y }, hitTank: hit };
    }

    // Terrain collision.
    const ground = groundAt(terrain, x);
    if (y >= ground) {
      if (bounces > 0) {
        // Reflect vertical velocity with damping and continue.
        y = ground - 1;
        vy = -vy * 0.55;
        vx = vx * 0.75;
        bounces--;
        // If the bounce is too weak, settle and detonate.
        if (Math.abs(vy) < 60) {
          sampleInto.push({ x, y: ground });
          return { point: { x, y: ground }, hitTank: null };
        }
        continue;
      }
      sampleInto.push({ x, y: ground });
      return { point: { x, y: ground }, hitTank: null };
    }

    // Hit the bottom of the world.
    if (y > WORLD_HEIGHT) {
      return { point: { x, y: WORLD_HEIGHT }, hitTank: null };
    }
  }
  return { point: { x, y }, hitTank: null };
}

/**
 * Simulate a full shot (may be multiple projectiles for cluster/triple/barrage).
 * Returns a merged trajectory (primary projectile) plus every impact point.
 */
export function simulateShot(
  shooter: TankState,
  angleDeg: number,
  power: number,
  weapon: WeaponConfig,
  terrain: number[],
  tanks: Record<PlayerId, TankState>,
): SimResult {
  const speed = powerToSpeed(power) * weapon.projectileSpeed;
  // Angle convention: 0deg = right, 90deg = straight up, 180deg = left.
  // Screen y is inverted so upward velocity is negative.
  const muzzleLen = 40;
  const impacts: SimHit[] = [];
  const primaryTrajectory: Vec2[] = [];

  const count = Math.max(1, weapon.projectiles);
  for (let i = 0; i < count; i++) {
    // Spread multi-shot projectiles symmetrically around the aim angle.
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * weapon.spreadDeg;
    const a = ((angleDeg + offset) * Math.PI) / 180;
    const dirX = Math.cos(a);
    const dirY = -Math.sin(a);
    const origin: Vec2 = {
      x: shooter.x + dirX * muzzleLen,
      y: shooter.y + dirY * muzzleLen,
    };
    const vx = dirX * speed;
    const vy = dirY * speed;
    // Only sample the first projectile's path for the rendered trajectory line.
    const sink = i === 0 ? primaryTrajectory : [];
    impacts.push(simulateOne(origin, vx, vy, weapon, terrain, tanks, sink));
  }

  return { trajectory: primaryTrajectory, impacts };
}

/**
 * Predict a trajectory for the aiming preview WITHOUT resolving collisions with
 * tanks (used by the client-side prediction line; the client runs its own copy
 * but we expose the same math for parity if needed).
 */
export function predictTrajectory(
  origin: Vec2,
  angleDeg: number,
  power: number,
  weapon: WeaponConfig,
  terrain: number[],
): Vec2[] {
  const speed = powerToSpeed(power) * weapon.projectileSpeed;
  const a = (angleDeg * Math.PI) / 180;
  let x = origin.x;
  let y = origin.y;
  let vx = Math.cos(a) * speed;
  let vy = -Math.sin(a) * speed;
  const g = GRAVITY * weapon.gravityScale;
  const pts: Vec2[] = [];
  let t = 0;
  while (t < MAX_SIM_TIME) {
    vy += g * SIM_STEP;
    x += vx * SIM_STEP;
    y += vy * SIM_STEP;
    t += SIM_STEP;
    if (t % (1 / 30) < SIM_STEP) pts.push({ x, y });
    if (x < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) break;
    if (y >= groundAt(terrain, x)) break;
  }
  return pts;
}
