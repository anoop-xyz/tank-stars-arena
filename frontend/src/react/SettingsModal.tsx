import { useSettings } from '@/store/settings';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const s = useSettings();

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      s.setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      s.setFullscreen(false);
    }
  };

  return (
    <div className="overlay" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="panel col fade-in" style={{ maxWidth: 460 }}>
        <div className="title" style={{ fontSize: 28 }}>Settings</div>

        <div>
          <div className="label"><span>Master Volume</span><span>{Math.round(s.masterVolume * 100)}%</span></div>
          <input className="slider" type="range" min={0} max={1} step={0.01}
            value={s.masterVolume} onChange={(e) => s.setMasterVolume(Number(e.target.value))} />
        </div>
        <div>
          <div className="label"><span>Music Volume</span><span>{Math.round(s.musicVolume * 100)}%</span></div>
          <input className="slider" type="range" min={0} max={1} step={0.01}
            value={s.musicVolume} onChange={(e) => s.setMusicVolume(Number(e.target.value))} />
        </div>
        <div>
          <div className="label"><span>Effects Volume</span><span>{Math.round(s.effectsVolume * 100)}%</span></div>
          <input className="slider" type="range" min={0} max={1} step={0.01}
            value={s.effectsVolume} onChange={(e) => s.setEffectsVolume(Number(e.target.value))} />
        </div>
        <div>
          <div className="label"><span>Graphics Quality</span></div>
          <div className="row">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button key={q}
                className={`btn ${s.quality === q ? 'gold' : 'secondary'}`}
                onClick={() => s.setQuality(q)}>{q}</button>
            ))}
          </div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={toggleFullscreen}>
            {s.fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button className={`btn ${s.muted ? 'gold' : 'secondary'}`} onClick={s.toggleMute}>
            {s.muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
