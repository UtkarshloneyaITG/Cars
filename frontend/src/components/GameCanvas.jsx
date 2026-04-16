import React, { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { render } from '../game/renderer.js';
import useGameInput from '../hooks/useGameInput.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/track.js';

export default function GameCanvas({ sendMessage }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const rafRef = useRef(null);

  const roomState = useGameStore((s) => s.roomState);
  const isRacing  = roomState === 'racing';

  // Start input loop (sends to server each frame while racing)
  useGameInput(sendMessage, isRacing);

  // Scale canvas to fit viewport while preserving aspect ratio
  const applyScale = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const vw = wrapper.clientWidth;
    const vh = wrapper.clientHeight;

    // Contain scaling: fit the whole canvas with no clipping.
    // Side/top gaps blend in because the wrapper background matches the canvas.
    const scale    = Math.min(vw / CANVAS_WIDTH, vh / CANVAS_HEIGHT);
    const displayW = Math.floor(CANVAS_WIDTH  * scale);
    const displayH = Math.floor(CANVAS_HEIGHT * scale);

    canvas.style.width  = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const { gameState, playerId, selectedMap } = useGameStore.getState();
      render(ctx, gameState, playerId, timestamp, selectedMap);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Resize observer
  useEffect(() => {
    applyScale();

    const ro = new ResizeObserver(applyScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    window.addEventListener('resize', applyScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', applyScale);
    };
  }, [applyScale]);

  return (
    <div
      ref={wrapperRef}
      className="game-wrapper"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',   /* matches canvas clear color — gaps are invisible */
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          display: 'block',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
}
