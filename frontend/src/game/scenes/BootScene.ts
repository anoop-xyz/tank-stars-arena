// Generates all textures procedurally so the game is fully playable with no art
// files. Each texture key matches what entities request; dropping real PNGs into
// public/assets and loading them here later is a drop-in upgrade.

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeTankBody('tank_body_p1', 0x4ea1ff);
    this.makeTankBody('tank_body_p2', 0xff6b6b);
    this.makeTurret('tank_turret_p1', 0x2f6fbf);
    this.makeTurret('tank_turret_p2', 0xbf3f3f);
    this.makeProjectile('projectile', 0xffd24a);
    this.scene.start('Battle');
  }

  private makeTankBody(key: string, color: number) {
    const g = this.add.graphics();
    // Hull.
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 12, 64, 22, 6);
    // Turret base dome.
    g.fillStyle(color, 1);
    g.fillEllipse(32, 14, 34, 20);
    // Tracks.
    g.fillStyle(0x222222, 1);
    g.fillRoundedRect(-2, 30, 68, 12, 6);
    for (let i = 0; i < 6; i++) { g.fillStyle(0x444444, 1); g.fillCircle(6 + i * 11, 36, 4); }
    g.generateTexture(key, 66, 44);
    g.destroy();
  }

  private makeTurret(key: string, color: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 44, 8); // barrel
    g.generateTexture(key, 44, 8);
    g.destroy();
  }

  private makeProjectile(key: string, color: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(4, 4, 2);
    g.generateTexture(key, 12, 12);
    g.destroy();
  }
}
