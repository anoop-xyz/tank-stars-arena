// Procedural sound manager. Synthesizes SFX with the WebAudio API so the game
// ships with audio and zero binary files. Custom audio can later be layered in
// by loading files in BootScene and routing through playSample(). Respects the
// settings store volumes + mute.

import { useSettings } from '@/store/settings';

export class SoundManager {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  private gainForEffects(): number {
    const s = useSettings.getState();
    if (s.muted) return 0;
    return s.masterVolume * s.effectsVolume;
  }

  /** Simple oscillator blip for UI clicks and countdown warnings. */
  blip(freq = 660, duration = 0.08, type: OscillatorType = 'square') {
    const g = this.gainForEffects();
    if (g <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = g * 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  /** Noisy filtered burst for explosions; bigger => lower, longer. */
  explosion(big = false) {
    const g = this.gainForEffects();
    if (g <= 0) return;
    const ctx = this.ensure();
    const duration = big ? 0.9 : 0.5;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // White noise with exponential decay envelope.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = big ? 500 : 1200;
    const gain = ctx.createGain();
    gain.gain.value = g * (big ? 0.9 : 0.6);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  }

  /** Rising whistle for a missile launch. */
  launch() {
    const g = this.gainForEffects();
    if (g <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.3);
    gain.gain.value = g * 0.25;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.35);
  }
}

export const soundManager = new SoundManager();
