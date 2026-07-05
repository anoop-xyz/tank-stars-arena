// Tank entity: body + rotating turret, recoil animation, health-driven visual
// state, and floating damage numbers. Built so new tank skins are a texture
// swap (bodyKey/turretKey) without touching logic.

import Phaser from 'phaser';
import { PlayerId } from '@/types/game';
import { MAX_HEALTH } from '@/constants/config';

export class Tank {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private turret: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private facing: 1 | -1;
  health = MAX_HEALTH;

  constructor(scene: Phaser.Scene, id: PlayerId, x: number, y: number, facing: 1 | -1) {
    this.scene = scene;
    this.facing = facing;
    this.body = scene.add.image(0, 0, id === 'p1' ? 'tank_body_p1' : 'tank_body_p2');
    this.turret = scene.add.image(6 * facing, -10, id === 'p1' ? 'tank_turret_p1' : 'tank_turret_p2');
    this.turret.setOrigin(0.1, 0.5);
    this.turret.setDepth(5);
    this.container = scene.add.container(x, y, [this.body, this.turret]);
    this.container.setDepth(5);
    this.body.setFlipX(facing === -1);
  }

  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  /** Aim the turret. angleDeg uses 0=right, 90=up, 180=left (world convention). */
  setTurretAngle(angleDeg: number) {
    // Convert to Phaser rotation (screen y down): negative because up is -y.
    this.turret.setRotation((-angleDeg * Math.PI) / 180);
  }

  /** Recoil kick when firing. */
  recoil() {
    const dx = -this.facing * 8;
    this.scene.tweens.add({
      targets: this.container, x: this.container.x + dx, duration: 60, yoyo: true, ease: 'Quad.Out',
    });
    this.scene.tweens.add({
      targets: this.turret, x: this.turret.x - this.facing * 5, duration: 70, yoyo: true, ease: 'Quad.Out',
    });
  }

  /** Update health and flash the body on damage; play destroyed fade at zero. */
  setHealth(hp: number) {
    const took = hp < this.health;
    this.health = hp;
    if (took) {
      this.scene.tweens.add({ targets: this.body, alpha: 0.3, duration: 60, yoyo: true, repeat: 1 });
    }
    if (hp <= 0) {
      this.scene.tweens.add({ targets: this.container, alpha: 0.25, angle: this.facing * 12, duration: 500 });
    }
  }

  /** Floating damage number with crit styling. */
  showDamage(amount: number, critical: boolean) {
    const txt = this.scene.add.text(this.container.x, this.container.y - 50, `-${amount}${critical ? '!' : ''}`, {
      fontFamily: 'Inter, sans-serif',
      fontSize: critical ? '34px' : '24px',
      color: critical ? '#ffd24a' : '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 60, alpha: 0, duration: 1100, ease: 'Quad.Out', onComplete: () => txt.destroy(),
    });
  }

  get x() { return this.container.x; }
  get y() { return this.container.y; }
}
