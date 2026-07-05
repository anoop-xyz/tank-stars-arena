// Global tuning constants shared by the authoritative simulation.
// Frontend mirrors the world dimensions so rendering matches server truth.

export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;

export const MAX_HEALTH = 1000;
export const TURN_SECONDS = 30;

// Deterministic projectile integrator settings.
export const GRAVITY = 900;          // px/s^2
export const SIM_STEP = 1 / 120;     // fixed timestep for stable integration
export const MAX_SIM_TIME = 12;      // safety cap (seconds) per shot

// Power (0..100) maps to launch speed in px/s.
export const MIN_LAUNCH_SPEED = 300;
export const MAX_LAUNCH_SPEED = 1400;

// Damage model.
export const DIRECT_HIT_BONUS = 1.5;   // multiplier when explosion centre ~ target
export const DIRECT_HIT_DISTANCE = 28; // px considered a direct hit
export const CRIT_CHANCE = 0.15;       // 15% chance
export const CRIT_MULTIPLIER = 1.75;

// Wind is intentionally disabled for now (see spec). Kept for future expansion.
export const WIND_ENABLED = false;
