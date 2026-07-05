// Global settings + session store (Zustand). Persists audio/graphics prefs to
// localStorage and holds the active room/player session for React <-> Phaser.

import { create } from 'zustand';
import { PlayerId, RoomState } from '@/types/game';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type Screen = 'menu' | 'room' | 'waiting' | 'game' | 'end';

interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  fullscreen: boolean;
  quality: GraphicsQuality;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setEffectsVolume: (v: number) => void;
  toggleMute: () => void;
  setFullscreen: (v: boolean) => void;
  setQuality: (q: GraphicsQuality) => void;
}

interface SessionState {
  screen: Screen;
  roomCode: string | null;
  playerId: PlayerId | null;
  room: RoomState | null;
  setScreen: (s: Screen) => void;
  setSession: (code: string, playerId: PlayerId) => void;
  setRoom: (room: RoomState) => void;
  reset: () => void;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  masterVolume: load('ts_master', 0.8),
  musicVolume: load('ts_music', 0.6),
  effectsVolume: load('ts_fx', 0.9),
  muted: load('ts_muted', false),
  fullscreen: false,
  quality: load<GraphicsQuality>('ts_quality', 'high'),
  setMasterVolume: (v) => { localStorage.setItem('ts_master', JSON.stringify(v)); set({ masterVolume: v }); },
  setMusicVolume: (v) => { localStorage.setItem('ts_music', JSON.stringify(v)); set({ musicVolume: v }); },
  setEffectsVolume: (v) => { localStorage.setItem('ts_fx', JSON.stringify(v)); set({ effectsVolume: v }); },
  toggleMute: () => { const m = !get().muted; localStorage.setItem('ts_muted', JSON.stringify(m)); set({ muted: m }); },
  setFullscreen: (v) => set({ fullscreen: v }),
  setQuality: (q) => { localStorage.setItem('ts_quality', JSON.stringify(q)); set({ quality: q }); },
}));

export const useSession = create<SessionState>((set) => ({
  screen: 'menu',
  roomCode: null,
  playerId: null,
  room: null,
  setScreen: (s) => set({ screen: s }),
  setSession: (code, playerId) => set({ roomCode: code, playerId }),
  setRoom: (room) => set({ room }),
  reset: () => set({ screen: 'menu', roomCode: null, playerId: null, room: null }),
}));
