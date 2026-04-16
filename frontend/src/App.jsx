import React, { useState } from 'react';
import useWebSocket from './hooks/useWebSocket';
import { useGameStore } from './store/gameStore';
import StartScreen from './components/StartScreen';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Scoreboard from './components/Scoreboard';
import CamoScreen from './components/CamoScreen';

// Small inline countdown component shown on top of the GameCanvas during
// the countdown phase while roomState transitions from 'countdown' → 'racing'.
function RaceCountdownOverlay() {
  const countdown = useGameStore((s) => s.countdown);
  if (countdown == null) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        zIndex: 50,
        pointerEvents: 'none',
        backdropFilter: 'blur(2px)',
      }}
    >
      {countdown > 0 ? (
        <div
          key={countdown}
          style={{
            fontSize: 'clamp(6rem, 18vw, 11rem)',
            fontWeight: 900,
            fontFamily: 'Courier New, monospace',
            background: 'linear-gradient(135deg, #e63946, #ffd700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'countdownPop 1s ease forwards',
            position: 'relative',
            left: '50%',
            filter: 'drop-shadow(0 0 30px rgba(230,57,70,0.7))',
          }}
        >
          {countdown}
        </div>
      ) : (
        <div
          key="go"
          style={{
            fontSize: 'clamp(4rem, 14vw, 9rem)',
            fontWeight: 900,
            fontFamily: 'Courier New, monospace',
            color: '#2ecc71',
            textShadow: '0 0 30px #2ecc71, 0 0 60px #2ecc71',
            animation: 'raceStart 1s ease forwards',
            position: 'relative',
            left: '50%',
          }}
        >
          GO!
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  // Hooks must always be called unconditionally — before any early return
  const { sendMessage, connected } = useWebSocket();
  const roomState = useGameStore((s) => s.roomState);

  const handleUnlock = () => setUnlocked(true);

  if (!unlocked) {
    return <CamoScreen onUnlock={handleUnlock} />;
  }

  if (roomState === 'idle') {
    return <StartScreen sendMessage={sendMessage} connected={connected} />;
  }

  if (roomState === 'waiting' || roomState === 'countdown') {
    return <Lobby sendMessage={sendMessage} />;
  }

  if (roomState === 'racing') {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <GameCanvas sendMessage={sendMessage} />
        <HUD />
        <RaceCountdownOverlay />
      </div>
    );
  }

  if (roomState === 'finished') {
    return <Scoreboard sendMessage={sendMessage} />;
  }

  // Fallback
  return <StartScreen sendMessage={sendMessage} connected={connected} />;
}
