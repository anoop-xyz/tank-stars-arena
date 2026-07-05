// Client-side global config. World dimensions MUST match the server so that
// authoritative coordinates render correctly.

export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;
export const MAX_HEALTH = 1000;
export const TURN_SECONDS = 30;

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

// Health bar colour thresholds (fraction of max health).
export const HEALTH_COLORS = [
  { min: 0.66, color: 0x33cc55 }, // green
  { min: 0.4, color: 0xe6d100 },  // yellow
  { min: 0.2, color: 0xef8a17 },  // orange
  { min: 0.0, color: 0xe23b3b },  // red
];

export function healthColor(fraction: number): number {
  for (const band of HEALTH_COLORS) if (fraction >= band.min) return band.color;
  return 0xe23b3b;
}
