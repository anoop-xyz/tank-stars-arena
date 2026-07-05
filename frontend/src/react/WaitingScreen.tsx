import { useEffect, useState } from 'react';
import { socketManager } from '@/networking/SocketManager';
import { useSession } from '@/store/settings';

export function WaitingScreen() {
  const { roomCode, setScreen, reset } = useSession();
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const off = socketManager.onPlayerJoined(() => setJoined(true));
    return off;
  }, []);

  const copy = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overlay fade-in">
      <div className="title" style={{ fontSize: 36 }}>Waiting for opponent</div>
      <div className="panel col">
        <div className="small">Share this room code:</div>
        <div className="code">{roomCode}</div>
        <button className="btn gold" onClick={copy}>{copied ? 'Copied!' : 'Copy Room Code'}</button>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div className="spinner" />
        </div>
        <div className="small">{joined ? 'Opponent joined! Starting match...' : 'Waiting for player 2 to join...'}</div>
        <button className="btn secondary" onClick={() => { reset(); setScreen('menu'); }}>Leave Room</button>
      </div>
    </div>
  );
}
