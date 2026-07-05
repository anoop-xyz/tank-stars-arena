// Damage resolution. Given an explosion and the tanks, compute how much damage
// each tank takes based on distance falloff, direct-hit bonus, crit chance, and
// per-tank armor. Deterministic except for the crit roll, which the server owns.

import {
  DIRECT_HIT_BONUS,
  DIRECT_HIT_DISTANCE,
  CRIT_CHANCE,
  CRIT_MULTIPLIER,
} from '../constants';
import { WeaponConfig } from './weapons';
import { TankState, PlayerId, DamageEvent } from '../types';

export interface ExplosionSpec {
  x: number;
  y: number;
  radius: number;
  weapon: WeaponConfig;
  directTarget: PlayerId | null; // set when the projectile scored a direct tank hit
}

/**
 * Resolve a single explosion against both tanks. Returns damage events and
 * mutates tank health. Damage falls off linearly to zero at the explosion edge.
 */
export function resolveExplosion(
  explosion: ExplosionSpec,
  tanks: Record<PlayerId, TankState>,
  rng: () => number,
): DamageEvent[] {
  const events: DamageEvent[] = [];
  for (const id of ['p1', 'p2'] as PlayerId[]) {
    const tank = tanks[id];
    if (tank.health <= 0) continue;

    const dx = tank.x - explosion.x;
    const dy = tank.y - explosion.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > explosion.radius) continue; // outside blast

    // Linear falloff: full damage at centre, zero at the edge.
    const falloff = 1 - dist / explosion.radius;
    let dmg = explosion.weapon.baseDamage * falloff;

    const directHit =
      explosion.directTarget === id || dist <= DIRECT_HIT_DISTANCE;
    if (directHit) dmg *= DIRECT_HIT_BONUS;

    const critical = rng() < CRIT_CHANCE;
    if (critical) dmg *= CRIT_MULTIPLIER;

    // Armor is a flat fractional reduction.
    dmg *= 1 - tank.armor;

    dmg = Math.max(0, Math.round(dmg));
    if (dmg <= 0) continue;

    tank.health = Math.max(0, tank.health - dmg);
    events.push({
      target: id,
      amount: dmg,
      critical,
      directHit,
      x: tank.x,
      y: tank.y,
    });
  }
  return events;
}
