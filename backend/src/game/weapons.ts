// Data-driven weapon registry. Every weapon is a plain config object, so adding
// a new weapon later is a one-line entry (SOLID: open for extension). The server
// uses these numbers authoritatively; the client uses matching ids for art/sound.

export interface WeaponConfig {
  id: string;
  name: string;
  baseDamage: number;
  explosionRadius: number;  // world px; also terrain destruction radius
  projectileSpeed: number;  // multiplier applied to launch speed
  cooldownTurns: number;    // turns before it can be used again by same player
  bounces: number;          // >0 => bouncing weapon
  projectiles: number;      // >1 => multi-shot (triple, cluster, barrage)
  spreadDeg: number;        // angular spread for multi-shot
  big: boolean;             // triggers screen flash / heavy shake
  gravityScale: number;     // per-weapon gravity feel (sniper/laser flatter)
}

export const WEAPONS: Record<string, WeaponConfig> = {
  basic_missile:   { id: 'basic_missile',   name: 'Basic Missile',   baseDamage: 120, explosionRadius: 60,  projectileSpeed: 1.0,  cooldownTurns: 0, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 1.0 },
  big_missile:     { id: 'big_missile',     name: 'Big Missile',     baseDamage: 220, explosionRadius: 90,  projectileSpeed: 0.95, cooldownTurns: 1, bounces: 0, projectiles: 1, spreadDeg: 0,  big: true,  gravityScale: 1.0 },
  triple_missile:  { id: 'triple_missile',  name: 'Triple Missile',  baseDamage: 80,  explosionRadius: 50,  projectileSpeed: 1.0,  cooldownTurns: 1, bounces: 0, projectiles: 3, spreadDeg: 7,  big: false, gravityScale: 1.0 },
  sniper_shot:     { id: 'sniper_shot',     name: 'Sniper Shot',     baseDamage: 180, explosionRadius: 30,  projectileSpeed: 1.6,  cooldownTurns: 1, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 0.4 },
  laser_beam:      { id: 'laser_beam',      name: 'Laser Beam',      baseDamage: 160, explosionRadius: 24,  projectileSpeed: 2.2,  cooldownTurns: 2, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 0.05 },
  cluster_bomb:    { id: 'cluster_bomb',    name: 'Cluster Bomb',    baseDamage: 70,  explosionRadius: 45,  projectileSpeed: 1.0,  cooldownTurns: 2, bounces: 0, projectiles: 5, spreadDeg: 10, big: false, gravityScale: 1.0 },
  nuke:            { id: 'nuke',            name: 'Nuke',            baseDamage: 400, explosionRadius: 160, projectileSpeed: 0.85, cooldownTurns: 4, bounces: 0, projectiles: 1, spreadDeg: 0,  big: true,  gravityScale: 1.1 },
  freeze_bomb:     { id: 'freeze_bomb',     name: 'Freeze Bomb',     baseDamage: 90,  explosionRadius: 70,  projectileSpeed: 1.0,  cooldownTurns: 2, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 1.0 },
  napalm:          { id: 'napalm',          name: 'Napalm',          baseDamage: 110, explosionRadius: 80,  projectileSpeed: 0.95, cooldownTurns: 2, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 1.0 },
  bouncing_bomb:   { id: 'bouncing_bomb',   name: 'Bouncing Bomb',   baseDamage: 140, explosionRadius: 65,  projectileSpeed: 1.05, cooldownTurns: 1, bounces: 3, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 1.0 },
  heavy_bomb:      { id: 'heavy_bomb',      name: 'Heavy Bomb',      baseDamage: 260, explosionRadius: 100, projectileSpeed: 0.8,  cooldownTurns: 2, bounces: 0, projectiles: 1, spreadDeg: 0,  big: true,  gravityScale: 1.3 },
  air_strike:      { id: 'air_strike',      name: 'Air Strike',      baseDamage: 90,  explosionRadius: 55,  projectileSpeed: 1.0,  cooldownTurns: 3, bounces: 0, projectiles: 4, spreadDeg: 5,  big: false, gravityScale: 1.0 },
  rocket_barrage:  { id: 'rocket_barrage',  name: 'Rocket Barrage',  baseDamage: 60,  explosionRadius: 40,  projectileSpeed: 1.1,  cooldownTurns: 3, bounces: 0, projectiles: 6, spreadDeg: 12, big: false, gravityScale: 0.9 },
  guided_missile:  { id: 'guided_missile',  name: 'Guided Missile',  baseDamage: 150, explosionRadius: 60,  projectileSpeed: 1.0,  cooldownTurns: 2, bounces: 0, projectiles: 1, spreadDeg: 0,  big: false, gravityScale: 0.7 },
  mega_missile:    { id: 'mega_missile',    name: 'Mega Missile',    baseDamage: 320, explosionRadius: 130, projectileSpeed: 0.9,  cooldownTurns: 3, bounces: 0, projectiles: 1, spreadDeg: 0,  big: true,  gravityScale: 1.15 },
};

export const DEFAULT_WEAPON_ID = 'basic_missile';
export const WEAPON_IDS = Object.keys(WEAPONS);

export function getWeapon(id: string): WeaponConfig {
  return WEAPONS[id] ?? WEAPONS[DEFAULT_WEAPON_ID];
}
