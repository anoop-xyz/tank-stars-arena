// Mounts the Phaser game into a div and overlays the React HUD. Passes the
// current authoritative room state into the Phaser registry before the scene
// reads it, then tears the game down on unmount.

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { useSession } from '@/store/settings';
import { HUD } from './HUD';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const room = useSession((s) => s.room);

  useEffect(() => {
    let disposed = false;
    // Lazy-load Phaser + game so the menu bundle stays light.
    import('@/game/PhaserGame').then(({ createPhaserGame }) => {
      if (disposed || !containerRef.current) return;
      const game = createPhaserGame(containerRef.current);
      if (room) game.registry.set('roomState', room);
      gameRef.current = game;
    });
    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div id="game-root" ref={containerRef} />
      <HUD />
    </div>
  );
}
