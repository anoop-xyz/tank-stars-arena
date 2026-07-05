// Procedural terrain generation + destruction. Terrain is a 1px-resolution
// heightmap: terrain[x] = the screen-y of the ground surface at column x.
// Lower y = higher ground (screen coords). Destruction raises the surface y
// (removes ground) within a circle.

import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants';

// Small deterministic PRNG (mulberry32) so a seed reproduces terrain on both
// clients if ever needed, and keeps generation server-authoritative.
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

/**
 * Generate smooth rolling hills by summing a few sine waves with randomized
 * phase/amplitude, then clamping into a comfortable vertical band.
 */
export function generateTerrain(seed: number): number[] {
  const rand = mulberry32(seed);
  const baseline = WORLD_HEIGHT * 0.72;
  const amp1 = 60 + rand() * 80;
  const amp2 = 30 + rand() * 50;
  const amp3 = 15 + rand() * 25;
  const f1 = 0.0016 + rand() * 0.0012;
  const f2 = 0.0041 + rand() * 0.0022;
  const f3 = 0.0091 + rand() * 0.004;
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;

  const terrain = new Array<number>(WORLD_WIDTH);
  for (let x = 0; x < WORLD_WIDTH; x++) {
    const h =
      Math.sin(x * f1 + p1) * amp1 +
      Math.sin(x * f2 + p2) * amp2 +
      Math.sin(x * f3 + p3) * amp3;
    let y = baseline - h;
    // Clamp so terrain never covers the whole screen or leaves no floor.
    y = Math.max(WORLD_HEIGHT * 0.4, Math.min(WORLD_HEIGHT * 0.92, y));
    terrain[x] = y;
  }
  return terrain;
}

/**
 * Carve a circular crater at (cx, cy) of the given radius. Raises the surface
 * y within the affected columns (removing ground). Mutates and returns terrain.
 */
export function destroyTerrain(
  terrain: number[],
  cx: number,
  cy: number,
  radius: number,
): number[] {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil(cx + radius));
  for (let x = minX; x <= maxX; x++) {
    const dx = x - cx;
    const half = Math.sqrt(Math.max(0, radius * radius - dx * dx));
    if (half <= 0) continue;
    const craterBottom = cy + half; // deepest point of the carve at this column
    // Only lower ground: if existing surface is above the crater bottom, push
    // it down to the crater bottom (i.e. remove the dirt above it).
    if (terrain[x] < craterBottom) {
      terrain[x] = Math.min(WORLD_HEIGHT, craterBottom);
    }
  }
  return terrain;
}

/** Ground surface y at a given x (clamped to bounds). */
export function groundAt(terrain: number[], x: number): number {
  const xi = Math.max(0, Math.min(WORLD_WIDTH - 1, Math.round(x)));
  return terrain[xi];
}
