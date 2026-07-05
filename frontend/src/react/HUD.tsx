// In-game HUD overlay (React on top of the Phaser canvas). Shows both health
// bars with color states, whose turn it is, the 30s timer, angle + power
// controls, a cooldown-aware weapon selector, and fire + pause buttons. All
// input is dispatched to Phaser via the EventBus; Phaser forwards to the server.

import { useEffect, useState } from 'react';
import { EventBus, EVT, HudState } from '@/game/EventBus';
import { WEAPON_CATALOG } from '@/constants/weapons';
import { MAX_HEALTH } from '@/constants/config';
import { useSession, useSettings } from '@/store/settings';

function healthColorCss(fraction: number): string {
  if (fraction >= 0.66) return '#33cc55';
  if (fraction >= 0.4) return '#e6d100';
  if (fraction >= 0.2) return '#ef8a17';
  return '#e23b3b';
}

function HealthBar({ label, hp, align }: { label: string; hp: number; align: 'left' | 'right' }) {
  const frac = Math.max(0, hp / MAX_HEALTH);
  return (
    <div style={{ width: 260, textAlign: align }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cdd8f5', marginBottom: 4 }}>
        <span>{label}</span><span>{hp}</span>
      </div>
      <div style={{ height: 16, background: 'rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{
          width: `${frac * 100}%`, height: '100%', background: healthColorCss(frac),
          transition: 'width .35s ease, background .35s ease',
          marginLeft: align === 'right' ? 'auto' : 0,
        }} />
      </div>
    </div>
  );
}

export function HUD() {
  const playerId = useSession((s) => s.playerId);
  const { muted, toggleMute } = useSettings();
  const [hud, setHud] = useState<HudState>({
    p1Health: MAX_HEALTH, p2Health: MAX_HEALTH, currentTurn: 'p1', isMyTurn: false,
    timeLeft: 30, power: 50, angleDeg: 60, selectedWeaponId: WEAPON_CATALOG[0].id, cooldowns: {}, phase: 'playing',
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const handler = (s: HudState) => setHud(s);
    EventBus.on(EVT.HUD_UPDATE, handler);
    return () => { EventBus.off(EVT.HUD_UPDATE, handler); };
  }, []);

  const myLabel = playerId === 'p1' ? 'You (P1)' : 'You (P2)';
  const oppLabel = playerId === 'p1' ? 'Enemy (P2)' : 'Enemy (P1)';
  const timerDanger = hud.timeLeft <= 5;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', color: '#e8eefc', fontFamily: 'Inter, sans-serif' }}>
      {/* Top bar: health + timer */}
      <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none' }}>
        <HealthBar label={playerId === 'p1' ? myLabel : oppLabel} hp={hud.p1Health} align="left" />
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'none' }}>
        <HealthBar label={playerId === 'p2' ? myLabel : oppLabel} hp={hud.p2Health} align="right" />
      </div>
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#8fa0c4' }}>{hud.isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: timerDanger ? '#e23b3b' : '#ffd24a', transition: 'color .2s' }}>
          {hud.timeLeft}
        </div>
      </div>

      {/* Pause + mute */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(120px)', pointerEvents: 'auto', display: 'flex', gap: 8 }}>
        <button className="btn secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => setPaused((p) => !p)}>II</button>
        <button className="btn secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
      </div>

      {/* Bottom control bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16,
        display: 'flex', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between',
        pointerEvents: 'auto', background: 'linear-gradient(to top, rgba(11,16,32,0.9), transparent)',
      }}>
        {/* Angle + power */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 260 }}>
          <div>
            <div style={{ fontSize: 12, color: '#8fa0c4' }}>Angle: {Math.round(hud.angleDeg)}\u00b0</div>
            <input type="range" min={0} max={180} value={hud.angleDeg} disabled={!hud.isMyTurn}
              style={{ width: '100%' }}
              onChange={(e) => EventBus.emit(EVT.SET_ANGLE, Number(e.target.value))} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8fa0c4' }}>Power: {Math.round(hud.power)}%</div>
            <input type="range" min={0} max={100} value={hud.power} disabled={!hud.isMyTurn}
              style={{ width: '100%' }}
              onChange={(e) => EventBus.emit(EVT.SET_POWER, Number(e.target.value))} />
          </div>
        </div>

        {/* Weapon selector */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 620, justifyContent: 'center' }}>
          {WEAPON_CATALOG.map((w) => {
            const cd = hud.cooldowns[w.id] ?? 0;
            const selected = hud.selectedWeaponId === w.id;
            return (
              <button key={w.id}
                onClick={() => EventBus.emit(EVT.SELECT_WEAPON, w.id)}
                disabled={cd > 0}
                title={w.name}
                style={{
                  width: 54, height: 54, borderRadius: 10, cursor: cd > 0 ? 'not-allowed' : 'pointer',
                  border: selected ? '2px solid #ffd24a' : '1px solid rgba(255,255,255,0.2)',
                  background: cd > 0 ? 'rgba(40,40,60,0.6)' : 'rgba(20,28,51,0.9)',
                  color: '#fff', fontSize: 22, position: 'relative', opacity: cd > 0 ? 0.5 : 1,
                }}>
                {w.icon}
                {cd > 0 && <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 12, color: '#ffd24a' }}>{cd}</span>}
              </button>
            );
          })}
        </div>

        {/* Fire */}
        <button className="btn gold" style={{ width: 160, height: 64, fontSize: 22 }}
          disabled={!hud.isMyTurn}
          onClick={() => EventBus.emit(EVT.FIRE)}>
          FIRE
        </button>
      </div>

      {/* Pause overlay */}
      {paused && (
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
          <div className="panel col">
            <div className="title" style={{ fontSize: 28 }}>Paused</div>
            <button className="btn" onClick={() => setPaused(false)}>Resume</button>
          </div>
        </div>
      )}
    </div>
  );
}
