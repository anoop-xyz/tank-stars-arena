// Top-level React router. Owns the socket lifecycle and swaps between screens
// based on the session store. The Phaser game only mounts on the 'game' screen.

import { useEffect } from 'react';
import { socketManager } from '@/networking/SocketManager';
import { useSession } from '@/store/settings';
import { MainMenu } from '@/react/MainMenu';
import { RoomScreen } from '@/react/RoomScreen';
import { WaitingScreen } from '@/react/WaitingScreen';
import { EndScreen } from '@/react/EndScreen';
import { GameCanvas } from '@/react/GameCanvas';

export function App() {
  const { screen, setScreen, setSession, setRoom } = useSession();

  useEffect(() => {
    const offCreated = socketManager.onRoomCreated(({ code, playerId, state }) => {
      setSession(code, playerId);
      setRoom(state);
      setScreen('waiting');
    });
    const offJoined = socketManager.onRoomJoined(({ code, playerId, state }) => {
      setSession(code, playerId);
      setRoom(state);
      setScreen('waiting');
    });
    const offMatch = socketManager.onMatchStart(({ state }) => {
      setRoom(state);
      setScreen('game');
    });
    const offState = socketManager.onState((state) => {
      setRoom(state);
      if (state.phase === 'ended') setScreen('end');
    });
    return () => { offCreated(); offJoined(); offMatch(); offState(); };
  }, [setScreen, setSession, setRoom]);

  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'room' && <RoomScreen />}
      {screen === 'waiting' && <WaitingScreen />}
      {screen === 'game' && <GameCanvas />}
      {screen === 'end' && <EndScreen />}
    </>
  );
}
