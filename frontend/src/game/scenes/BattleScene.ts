// The main gameplay scene. It is a THIN renderer over authoritative server
// state: it never decides damage, hits, or turn order locally. It handles input
// intents (aim/fire), renders the resolved shot animation the server returns,
// and keeps the HUD in sync via the EventBus.

import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, TURN_SECONDS } from '@/constants/config';
import { socketManager } from '@/networking/SocketManager';
import { RoomState, ShotResult, PlayerId, Vec2 } from '@/types/game';
import { Tank } from '@/game/entities/Tank';
import { TerrainRenderer } from '@/game/entities/TerrainRenderer';
import { EffectsManager } from '@/game/managers/EffectsManager';
import { soundManager } from '@/game/managers/SoundManager';
import { EventBus, EVT } from '@/game/EventBus';
import { WEAPON_CATALOG } from '@/constants/weapons';

export class BattleScene extends Phaser.Scene {
  private terrainRenderer!: TerrainRenderer;
  private effects!: EffectsManager;
  private tanks!: Record<PlayerId, Tank>;
  private state!: RoomState;
  private myId: PlayerId = 'p1';

  // Local aim state (intent only; server validates).
  private angleDeg = 60;
  private power = 50;
  private weaponId = WEAPON_CATALOG[0].id;

  private trajectoryGfx!: Phaser.GameObjects.Graphics;
  private timeLeft = TURN_SECONDS;
  private timerEvent?: Phaser.Time.TimerEvent;
  private resolving = false;
  private lastWarnSecond = -1;

  constructor() { super('Battle'); }

  create() {
    this.myId = socketManager.playerId ?? 'p1';
    this.effects = new EffectsManager(this);
    this.terrainRenderer = new TerrainRenderer(this);
    this.trajectoryGfx = this.add.graphics().setDepth(8);

    // Sky backdrop.
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0b1020).setDepth(0);
    for (let i = 0; i < 60; i++) {
      this.add.circle(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT * 0.6, Math.random() * 1.5, 0xffffff, 0.6).setDepth(0);
    }

    // Camera fits the whole battlefield and eases into view.
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(400);

    // Seed from current session room state (set by React before scene start).
    const initial = (this.game.registry.get('roomState') as RoomState) ?? null;
    if (initial) this.applyState(initial);

    this.wireNetwork();
    this.wireInput();
    this.wireHudInput();
  }

  // ---- Networking ----
  private wireNetwork() {
    socketManager.onState((s) => this.applyState(s));
    socketManager.onShotResult((r) => this.playShot(r));
    socketManager.onOpponentAim(({ playerId, angleDeg }) => {
      // Reflect opponent's cannon movement live.
      if (playerId !== this.myId) this.tanks[playerId]?.setTurretAngle(angleDeg);
    });
  }

  private applyState(s: RoomState) {
    this.state = s;
    this.terrainRenderer.render(s.terrain);

    if (!this.tanks) {
      this.tanks = {
        p1: new Tank(this, 'p1', s.tanks.p1.x, s.tanks.p1.y, s.tanks.p1.facing),
        p2: new Tank(this, 'p2', s.tanks.p2.x, s.tanks.p2.y, s.tanks.p2.facing),
      };
    }
    for (const id of ['p1', 'p2'] as PlayerId[]) {
      this.tanks[id].setPosition(s.tanks[id].x, s.tanks[id].y);
      this.tanks[id].setHealth(s.tanks[id].health);
      this.tanks[id].setTurretAngle(s.tanks[id].angleDeg);
    }

    // Reset per-turn timer when it is a fresh playing turn.
    if (s.phase === 'playing' && s.turnEndsAt) {
      this.startTurnTimer(s.turnEndsAt);
    }
    this.emitHud();
    this.drawTrajectory();
  }

  // ---- Turn timer (display only; server is authoritative on expiry) ----
  private startTurnTimer(endsAt: number) {
    this.timerEvent?.remove();
    this.lastWarnSecond = -1;
    this.timerEvent = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        this.timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        // Countdown warning beeps in the final 5 seconds.
        if (this.isMyTurn() && this.timeLeft <= 5 && this.timeLeft > 0 && this.timeLeft !== this.lastWarnSecond) {
          soundManager.blip(880, 0.06, 'sine');
          this.lastWarnSecond = this.timeLeft;
        }
        this.emitHud();
      },
    });
  }

  private isMyTurn(): boolean {
    return this.state?.currentTurn === this.myId && this.state?.phase === 'playing' && !this.resolving;
  }

  // ---- Input: drag to aim, mouse wheel / keys for power ----
  private wireInput() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.isMyTurn()) return;
      const tank = this.tanks[this.myId];
      const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const dx = world.x - tank.x;
      const dy = tank.y - world.y; // invert: up is positive
      let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      ang = Math.max(0, Math.min(180, ang));
      this.angleDeg = ang;
      // Distance from tank sets power (clamped), enabling drag-aim + drag-power.
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.power = Math.max(0, Math.min(100, (dist / 6)));
      this.pushAim();
    });

    this.input.keyboard?.on('keydown-LEFT', () => { this.angleDeg = Math.min(180, this.angleDeg + 1); this.pushAim(); });
    this.input.keyboard?.on('keydown-RIGHT', () => { this.angleDeg = Math.max(0, this.angleDeg - 1); this.pushAim(); });
    this.input.keyboard?.on('keydown-UP', () => { this.power = Math.min(100, this.power + 2); this.pushAim(); });
    this.input.keyboard?.on('keydown-DOWN', () => { this.power = Math.max(0, this.power - 2); this.pushAim(); });
    this.input.keyboard?.on('keydown-SPACE', () => this.fire());
  }

  // ---- Input coming from the React HUD ----
  private wireHudInput() {
    EventBus.on(EVT.SET_ANGLE, (v: number) => { this.angleDeg = v; this.pushAim(); });
    EventBus.on(EVT.SET_POWER, (v: number) => { this.power = v; this.pushAim(); });
    EventBus.on(EVT.SELECT_WEAPON, (id: string) => { this.weaponId = id; socketManager.selectWeapon(id); this.emitHud(); });
    EventBus.on(EVT.FIRE, () => this.fire());
  }

  private pushAim() {
    if (!this.isMyTurn()) return;
    this.tanks[this.myId].setTurretAngle(this.angleDeg);
    socketManager.aim(this.angleDeg, this.power, this.weaponId);
    this.drawTrajectory();
    this.emitHud();
  }

  private fire() {
    if (!this.isMyTurn()) return;
    this.resolving = true;
    this.tanks[this.myId].recoil();
    soundManager.launch();
    socketManager.fire(this.angleDeg, this.power, this.weaponId);
    this.trajectoryGfx.clear();
  }

  // ---- Trajectory preview (client-side prediction, matches server integrator) ----
  private drawTrajectory() {
    this.trajectoryGfx.clear();
    if (!this.isMyTurn() || !this.state) return;
    const tank = this.tanks[this.myId];
    const a = (this.angleDeg * Math.PI) / 180;
    const speed = 300 + (this.power / 100) * (1400 - 300);
    let x = tank.x + Math.cos(a) * 40;
    let y = tank.y - Math.sin(a) * 40;
    let vx = Math.cos(a) * speed;
    let vy = -Math.sin(a) * speed;
    const g = 900;
    const step = 1 / 60;
    this.trajectoryGfx.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 90; i++) {
      vy += g * step;
      x += vx * step;
      y += vy * step;
      if (x < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) break;
      if (y >= this.state.terrain[Math.round(Math.max(0, Math.min(WORLD_WIDTH - 1, x)))]) break;
      if (i % 3 === 0) this.trajectoryGfx.fillCircle(x, y, 3);
    }
  }

  // ---- Play the authoritative shot result ----
  private playShot(r: ShotResult) {
    this.resolving = true;
    this.trajectoryGfx.clear();
    this.tanks[r.shooter]?.recoil();

    const proj = this.add.image(r.origin.x, r.origin.y, 'projectile').setDepth(9);
    const path = r.trajectory.length ? r.trajectory : (r.impact ? [r.impact] : []);
    let idx = 0;
    const flightMs = Math.min(1400, 400 + path.length * 8);
    const perPoint = path.length > 1 ? flightMs / path.length : flightMs;

    const advance = () => {
      if (idx >= path.length) {
        proj.destroy();
        this.detonate(r);
        return;
      }
      const pt: Vec2 = path[idx++];
      this.effects.trail(proj.x, proj.y, r.weaponId);
      this.tweens.add({
        targets: proj, x: pt.x, y: pt.y, duration: perPoint, ease: 'Linear', onComplete: advance,
      });
    };
    advance();
  }

  private detonate(r: ShotResult) {
    for (const e of r.explosions) {
      this.effects.explode(e.x, e.y, e.radius, e.weaponId, e.big);
    }
    // Redraw destroyed terrain from authoritative heightmap.
    this.terrainRenderer.render(r.terrain);
    // Apply health + damage popups.
    for (const id of ['p1', 'p2'] as PlayerId[]) {
      this.tanks[id].setPosition(r.tanks[id].x, r.tanks[id].y);
      this.tanks[id].setHealth(r.tanks[id].health);
    }
    for (const d of r.damageEvents) {
      this.tanks[d.target].showDamage(d.amount, d.critical);
    }
    this.resolving = false;
    if (r.winner) {
      this.emitHud();
      return; // React swaps to end screen on the 'ended' state.
    }
    this.emitHud();
    this.drawTrajectory();
  }

  private emitHud() {
    if (!this.state) return;
    EventBus.emit(EVT.HUD_UPDATE, {
      p1Health: this.state.tanks.p1.health,
      p2Health: this.state.tanks.p2.health,
      currentTurn: this.state.currentTurn,
      isMyTurn: this.isMyTurn(),
      timeLeft: this.timeLeft,
      power: this.power,
      angleDeg: this.angleDeg,
      selectedWeaponId: this.weaponId,
      cooldowns: this.state.tanks[this.myId].weaponCooldowns,
      phase: this.state.phase,
    });
  }
}
