// Visual effects: explosions (particles + shockwave + fire), smoke, terrain
// burn decals, camera shake, and screen flash. Uses pooled graphics where it
// matters for 60fps. Quality setting scales particle counts.

import Phaser from 'phaser';
import { useSettings } from '@/store/settings';
import { weaponVisual } from '@/constants/weapons';
import { soundManager } from './SoundManager';

export class EffectsManager {
  constructor(private scene: Phaser.Scene) {}

  private particleBudget(base: number): number {
    const q = useSettings.getState().quality;
    const scale = q === 'high' ? 1 : q === 'medium' ? 0.6 : 0.3;
    return Math.max(4, Math.floor(base * scale));
  }

  /** Full explosion: shockwave ring, particle burst, fire flash, decal, shake. */
  explode(x: number, y: number, radius: number, weaponId: string, big: boolean) {
    const v = weaponVisual(weaponId);
    const cam = this.scene.cameras.main;

    // Shockwave ring.
    const ring = this.scene.add.circle(x, y, radius * 0.3, v.color, 0.35);
    ring.setStrokeStyle(4, v.color, 0.9);
    this.scene.tweens.add({
      targets: ring,
      radius: radius * 1.4,
      alpha: 0,
      duration: big ? 520 : 340,
      ease: 'Cubic.Out',
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });

    // Particle burst (fire + debris).
    const count = this.particleBudget(big ? 60 : 30);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * (big ? 380 : 220);
      const p = this.scene.add.circle(x, y, 2 + Math.random() * 4, v.color, 1);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 60;
      this.scene.tweens.add({
        targets: p,
        x: x + vx * 0.6,
        y: y + vy * 0.6,
        alpha: 0,
        scale: 0.2,
        duration: 500 + Math.random() * 400,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      });
    }

    // Central fire flash.
    const flash = this.scene.add.circle(x, y, radius * 0.8, 0xfff3c0, 0.9);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 1.6, duration: 220, onComplete: () => flash.destroy() });

    // Smoke puffs.
    const smoke = this.particleBudget(big ? 14 : 7);
    for (let i = 0; i < smoke; i++) {
      const s = this.scene.add.circle(x + (Math.random() - 0.5) * radius, y, 8 + Math.random() * 14, 0x333333, 0.5);
      this.scene.tweens.add({
        targets: s, y: s.y - 40 - Math.random() * 60, alpha: 0, scale: 2,
        duration: 900 + Math.random() * 700, onComplete: () => s.destroy(),
      });
    }

    // Persistent burn decal on the ground.
    const decal = this.scene.add.circle(x, y, radius * 0.5, 0x1a1a1a, 0.5);
    decal.setDepth(2);
    this.scene.time.delayedCall(8000, () => this.scene.tweens.add({ targets: decal, alpha: 0, duration: 1500, onComplete: () => decal.destroy() }));

    // Camera shake + optional screen flash for big weapons.
    cam.shake(big ? 420 : 200, big ? 0.018 : 0.008);
    if (big) cam.flash(220, 255, 240, 200);

    soundManager.explosion(big);
  }

  /** Trailing smoke behind a moving projectile. */
  trail(x: number, y: number, weaponId: string) {
    const v = weaponVisual(weaponId);
    const p = this.scene.add.circle(x, y, 3, v.trailColor, 0.6);
    p.setDepth(6);
    this.scene.tweens.add({ targets: p, alpha: 0, scale: 0.3, duration: 400, onComplete: () => p.destroy() });
  }
}
