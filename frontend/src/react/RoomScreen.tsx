import { useEffect, useState } from 'react';
import { socketManager } from '@/networking/SocketManager';
import { useSession } from '@/store/settings';

export function RoomScreen() {
  const setScreen = useSession((s) => s.setScreen);
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const off = socketManager.onJoinError(({ message }) => setError(message));
    return off;
  }, []);

  const create = () => { setError(null); socketManager.createRoom(); };
  const join = () => {
    setError(null);
    if (code.length !== 6) { setError('Enter the 6-digit room code.'); return; }
    socketManager.joinRoom(code);
  };

  return (
    <div className="overlay fade-in">
      <div className="title" style={{ fontSize: 40 }}>Room Multiplayer</div>
      <div className="panel col">
        {mode === 'choose' && (
          <>
            <button className="btn" onClick={create}>Create Room</button>
            <button className="btn gold" onClick={() => setMode('join')}>Join Room</button>
            <button className="btn secondary" onClick={() => setScreen('menu')}>Back</button>
          </>
        )}
        {mode === 'join' && (
          <>
            <input
              className="input"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button className="btn" onClick={join}>Join</button>
            <button className="btn secondary" onClick={() => { setMode('choose'); setError(null); }}>Back</button>
          </>
        )}
        {error && <div className="small" style={{ color: 'var(--danger)' }}>{error}</div>}
      </div>
    </div>
  );
}
