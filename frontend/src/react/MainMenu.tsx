import { useState } from 'react';
import { useSession } from '@/store/settings';
import { SettingsModal } from './SettingsModal';

export function MainMenu() {
  const setScreen = useSession((s) => s.setScreen);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="overlay fade-in">
      <div>
        <div className="title">TANK STARS ARENA</div>
        <div className="subtitle">Turn-based artillery. Two tanks. One survivor.</div>
      </div>
      <div className="panel col">
        <button className="btn" onClick={() => setScreen('room')}>Play</button>
        <button className="btn secondary" onClick={() => setShowSettings(true)}>Settings</button>
        <button
          className="btn secondary"
          onClick={() => { if (confirm('Quit Tank Stars Arena?')) window.close(); }}
        >
          Quit
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
