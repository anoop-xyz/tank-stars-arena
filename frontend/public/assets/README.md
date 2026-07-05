# Custom Art & Audio (optional drop-in)

The game runs fully without any files here: `BootScene` generates all textures
procedurally and `SoundManager` synthesizes SFX via WebAudio. To upgrade to
custom art/audio, drop files here and wire them in without touching game logic.

## Texture keys

These keys are requested by entities. Replace the generated versions by loading
real images in `BootScene.preload()` under the SAME key:

| Key                | Used by            | Suggested size |
|--------------------|--------------------|----------------|
| `tank_body_p1`     | Player 1 hull      | 66x44          |
| `tank_body_p2`     | Player 2 hull      | 66x44          |
| `tank_turret_p1`   | Player 1 barrel    | 44x8           |
| `tank_turret_p2`   | Player 2 barrel    | 44x8           |
| `projectile`       | All projectiles    | 12x12          |

Example (in `BootScene.preload`):
```ts
this.load.image('tank_body_p1', 'assets/tanks/body_blue.png');
```
If a key is loaded, it overrides the generated primitive automatically.

## Per-weapon art / sound

Weapon ids are the single source of truth (see `constants/weapons.ts` on the
client and `game/weapons.ts` on the server). To give a weapon a custom sprite,
trail, explosion, or sound, key your assets by the weapon id, e.g.
`assets/weapons/nuke.png`, and branch on `weaponId` inside `EffectsManager` /
`SoundManager`. Because everything is data-driven, no new code paths are needed
to add a weapon: add one registry entry on each side.

## Music

Drop `assets/audio/music.mp3` and load it in `BootScene`, then play/loop it via
a small addition to `SoundManager` gated on the music volume in the settings
store. Kept out of the default build to avoid shipping placeholder audio.
