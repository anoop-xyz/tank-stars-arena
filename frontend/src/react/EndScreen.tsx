import { socketManager } from '@/networking/SocketManager';
import { useSession } from '@/store/settings';

export function EndScreen() {
  const { room, playerId, setScreen, reset } = useSession();
  const winner = room?.winner;
  const didWin = winner && winner === playerId;

  const playAgain = () => { socketManager.playAgain(); };
  const leave = () => { reset(); setScreen('menu'); };

  return (
    <div className="overlay fade-in">
      <div className={`big-result ${didWin ? 'win' : 'lose'}`}>
        {didWin ? 'VICTORY' : 'DEFEAT'}
      </div>
      <div className="subtitle">
        {didWin ? 'Your tank stands tall.' : 'Your tank has fallen.'}
      </div>
      <div className="panel col">
        <button className="btn" onClick={playAgain}>Play Again</button>
        <button className="btn secondary" onClick={leave}>Leave Room</button>
      </div>
    </div>
  );
}
