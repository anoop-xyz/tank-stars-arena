// Creates and configures the Phaser.Game instance. Uses Scale.FIT so the fixed
// 1920x1080 world scales responsively to any device in landscape, preserving
// aspect ratio (letterboxed if needed). Lazily instantiated by GameCanvas.

import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/constants/config';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: '#0b1020',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60, min: 30 },
    scene: [BootScene, BattleScene],
  });
}
