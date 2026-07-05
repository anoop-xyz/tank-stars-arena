// Client-side weapon catalog. Mirrors the server registry ids exactly so that
// selecting a weapon on the client maps to the correct authoritative config.
// Visual fields (color, trailColor, icon) are client-only presentation data.

export interface WeaponVisual {
  id: string;
  name: string;
  color: number;       // projectile / explosion tint
  trailColor: number;  // smoke/missile trail tint
  icon: string;        // emoji fallback icon until custom art is dropped in
  big: boolean;
}

export const WEAPON_CATALOG: WeaponVisual[] = [
  { id: 'basic_missile',  name: 'Basic Missile',  color: 0xffd24a, trailColor: 0xaaaaaa, icon: '\uD83D\uDE80', big: false },
  { id: 'big_missile',    name: 'Big Missile',    color: 0xff9a3c, trailColor: 0xbbbbbb, icon: '\uD83D\uDCA5', big: true },
  { id: 'triple_missile', name: 'Triple Missile', color: 0x8ad6ff, trailColor: 0x99ccff, icon: '\u2604\uFE0F', big: false },
  { id: 'sniper_shot',    name: 'Sniper Shot',    color: 0xffffff, trailColor: 0xdddddd, icon: '\uD83C\uDFAF', big: false },
  { id: 'laser_beam',     name: 'Laser Beam',     color: 0xff4d6d, trailColor: 0xff99aa, icon: '\u26A1', big: false },
  { id: 'cluster_bomb',   name: 'Cluster Bomb',   color: 0xffcf33, trailColor: 0xcccccc, icon: '\uD83E\uDDE8', big: false },
  { id: 'nuke',           name: 'Nuke',           color: 0x9dff5c, trailColor: 0xccffaa, icon: '\u2622\uFE0F', big: true },
  { id: 'freeze_bomb',    name: 'Freeze Bomb',    color: 0x7fe9ff, trailColor: 0xccf5ff, icon: '\u2744\uFE0F', big: false },
  { id: 'napalm',         name: 'Napalm',         color: 0xff6a00, trailColor: 0xff9944, icon: '\uD83D\uDD25', big: false },
  { id: 'bouncing_bomb',  name: 'Bouncing Bomb',  color: 0xb388ff, trailColor: 0xd0bbff, icon: '\uD83C\uDFB1', big: false },
  { id: 'heavy_bomb',     name: 'Heavy Bomb',     color: 0xcccccc, trailColor: 0x999999, icon: '\uD83D\uDCA3', big: true },
  { id: 'air_strike',     name: 'Air Strike',     color: 0x9ad0ff, trailColor: 0xbbddff, icon: '\u2708\uFE0F', big: false },
  { id: 'rocket_barrage', name: 'Rocket Barrage', color: 0xffa94d, trailColor: 0xffcc88, icon: '\uD83C\uDF86', big: false },
  { id: 'guided_missile', name: 'Guided Missile', color: 0x66ffcc, trailColor: 0xaaffee, icon: '\uD83D\uDEF0\uFE0F', big: false },
  { id: 'mega_missile',   name: 'Mega Missile',   color: 0xff5ccd, trailColor: 0xffaae4, icon: '\uD83C\uDF20', big: true },
];

export const WEAPON_MAP: Record<string, WeaponVisual> = Object.fromEntries(
  WEAPON_CATALOG.map((w) => [w.id, w]),
);

export function weaponVisual(id: string): WeaponVisual {
  return WEAPON_MAP[id] ?? WEAPON_CATALOG[0];
}
