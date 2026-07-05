// Renders the authoritative terrain heightmap as a filled polygon and redraws
// instantly when the server sends updated terrain after destruction.

import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/constants/config';

export class TerrainRenderer {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(3);
  }

  /** Redraw terrain from a heightmap. Sampled every few px for performance. */
  render(terrain: number[]) {
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x3a2f22, 1); // dirt base
    g.beginPath();
    const step = 4;
    g.moveTo(0, WORLD_HEIGHT);
    for (let x = 0; x < WORLD_WIDTH; x += step) {
      g.lineTo(x, terrain[x]);
    }
    g.lineTo(WORLD_WIDTH, terrain[WORLD_WIDTH - 1]);
    g.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    g.closePath();
    g.fillPath();

    // Grass cap: a thin brighter line along the surface.
    g.lineStyle(6, 0x5fae3a, 1);
    g.beginPath();
    g.moveTo(0, terrain[0]);
    for (let x = step; x < WORLD_WIDTH; x += step) g.lineTo(x, terrain[x]);
    g.strokePath();
  }
}
