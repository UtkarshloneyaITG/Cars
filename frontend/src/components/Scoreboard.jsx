import React from 'react';
import { useGameStore } from '../store/gameStore';

function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return null;
  const m  = Math.floor(seconds / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

const POSITION_CLASS = ['', 'p1', 'p2', 'p3'];
const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_CLASS = ['gold', 'silver', 'bronze'];

export default function Scoreboard({ sendMessage }) {
  const raceResults    = useGameStore((s) => s.raceResults);
  const reset          = useGameStore((s) => s.reset);
  const lastPlayerName = useGameStore((s) => s.lastPlayerName);
  const lastRoomId     = useGameStore((s) => s.lastRoomId);
  const gameMode       = useGameStore((s) => s.gameMode);
  const footballScores = useGameStore((s) => s.footballScores);

  const isFootball = gameMode === 'football';

  // Sort: finished first (by finish_time), then DNF
  const sorted = [...(raceResults || [])].sort((a, b) => {
    if (a.finish_time != null && b.finish_time != null) return a.finish_time - b.finish_time;
    if (a.finish_time != null) return -1;
    if (b.finish_time != null) return 1;
    return 0;
  });

  const podium = sorted.slice(0, 3);
  const rest   = sorted.slice(3);

  const handlePlayAgain = () => {
    reset();
    const name = lastPlayerName || 'Player';
    const room = lastRoomId || 'room1';
    sendMessage({ type: 'join_room', room_id: room, player_name: name });
  };

  const posClass = (idx) => (idx < 3 ? POSITION_CLASS[idx + 1] : '');

  // Football results take precedence
  if (isFootball) {
    // Prefer raceResults (stamped by race_finish) then fall back to live scores
    const redScore  = raceResults?.find((r) => r.team === 'red')?.score  ?? footballScores?.red  ?? 0;
    const blueScore = raceResults?.find((r) => r.team === 'blue')?.score ?? footballScores?.blue ?? 0;
    const winner    = redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : null;

    return (
      <div className="scoreboard">
        <div className="scoreboard-header">
          <h1 className="scoreboard-title">⚽ Match Over!</h1>
          <p className="scoreboard-subtitle">
            {winner === 'red' ? '🔴 Red Team Wins!' : winner === 'blue' ? '🔵 Blue Team Wins!' : 'It\'s a Draw!'}
          </p>
        </div>
        <div className="football-final-score">
          <div className={`football-final-team${winner === 'red' ? ' winner' : ''}`}>
            <div className="football-final-label" style={{ color: '#e74c3c' }}>🔴 RED</div>
            <div className="football-final-num" style={{ color: '#e74c3c' }}>{redScore}</div>
          </div>
          <div className="football-final-sep">—</div>
          <div className={`football-final-team${winner === 'blue' ? ' winner' : ''}`}>
            <div className="football-final-label" style={{ color: '#3498db' }}>BLUE 🔵</div>
            <div className="football-final-num" style={{ color: '#3498db' }}>{blueScore}</div>
          </div>
        </div>
        <button className="btn-play-again" onClick={handlePlayAgain}>⚽ Play Again</button>
      </div>
    );
  }

  return (
    <div className="scoreboard">

      {/* Header */}
      <div className="scoreboard-header">
        <h1 className="scoreboard-title">🏆 Race Complete!</h1>
        <p className="scoreboard-subtitle">Final Results</p>
      </div>

      {/* Podium (top 3) */}
      {podium.length > 0 && (
        <div className="podium">
          {/* Silver (2nd) */}
          {podium[1] && (
            <div className="podium-slot">
              <div
                className="podium-car"
                style={{
                  background: podium[1].color || '#888',
                  boxShadow: `0 0 10px ${podium[1].color || '#888'}88`,
                  borderRadius: '5px',
                  width: '36px',
                  height: '20px',
                }}
              />
              <div className="podium-name">{podium[1].name}</div>
              <div className="podium-time text-muted">
                {formatTime(podium[1].finish_time) || 'DNF'}
              </div>
              <div className="podium-block silver">
                <span className="podium-rank silver">🥈</span>
              </div>
            </div>
          )}

          {/* Gold (1st) */}
          {podium[0] && (
            <div className="podium-slot">
              <div
                className="podium-car"
                style={{
                  background: podium[0].color || '#888',
                  boxShadow: `0 0 14px ${podium[0].color || '#888'}`,
                  borderRadius: '5px',
                  width: '40px',
                  height: '22px',
                }}
              />
              <div className="podium-name" style={{ color: '#FFD700', fontWeight: 800 }}>
                {podium[0].name}
              </div>
              <div className="podium-time" style={{ color: '#FFD700' }}>
                {formatTime(podium[0].finish_time) || 'DNF'}
              </div>
              <div className="podium-block gold">
                <span className="podium-rank gold">🥇</span>
              </div>
            </div>
          )}

          {/* Bronze (3rd) */}
          {podium[2] && (
            <div className="podium-slot">
              <div
                className="podium-car"
                style={{
                  background: podium[2].color || '#888',
                  boxShadow: `0 0 8px ${podium[2].color || '#888'}88`,
                  borderRadius: '5px',
                  width: '32px',
                  height: '18px',
                }}
              />
              <div className="podium-name">{podium[2].name}</div>
              <div className="podium-time text-muted">
                {formatTime(podium[2].finish_time) || 'DNF'}
              </div>
              <div className="podium-block bronze">
                <span className="podium-rank bronze">🥉</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Driver</th>
              <th>Finish Time</th>
              <th>Best Lap</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const pc = posClass(idx);
              const finishTime = formatTime(p.finish_time);
              const bestLap    = formatTime(p.best_lap_time);

              return (
                <tr key={p.id || idx}>
                  <td>
                    <span className={`res-pos ${pc}`}>
                      {idx < 3 ? MEDAL[idx] : `${idx + 1}.`}
                    </span>
                  </td>
                  <td>
                    <div className="res-name">
                      <div
                        className="res-color-dot"
                        style={{
                          background: p.color || '#888',
                          boxShadow: `0 0 5px ${p.color || '#888'}`,
                        }}
                      />
                      <span style={{ color: p.color || '#e8e8f0' }}>{p.name}</span>
                    </div>
                  </td>
                  <td>
                    {finishTime
                      ? <span className="res-time">{finishTime}</span>
                      : <span className="dnf-badge">DNF</span>
                    }
                  </td>
                  <td>
                    <span className="res-best">
                      {bestLap || '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#8888aa', padding: '1rem' }}>
                  No results available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lap times breakdown (optional, for each player) */}
      {sorted.some((p) => p.lap_times && p.lap_times.length > 0) && (
        <div
          style={{
            width: 'min(700px, 96vw)',
            marginBottom: '1.5rem',
            animation: 'slideInUp 0.8s ease',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#8888aa',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}
          >
            Lap Times Breakdown
          </div>
          {sorted
            .filter((p) => p.lap_times && p.lap_times.length > 0)
            .map((p, idx) => (
              <div
                key={p.id || idx}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  marginBottom: '0.3rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                }}
              >
                <span
                  style={{
                    color: p.color || '#e8e8f0',
                    fontWeight: 700,
                    minWidth: '90px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </span>
                {p.lap_times.map((lt, li) => (
                  <span
                    key={li}
                    style={{
                      fontFamily: 'Courier New, monospace',
                      color: lt === p.best_lap_time ? '#FFD700' : '#c8c8e0',
                      background: lt === p.best_lap_time ? 'rgba(255,215,0,0.1)' : 'transparent',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                    }}
                  >
                    L{li + 1}: {formatTime(lt)}
                    {lt === p.best_lap_time ? ' ★' : ''}
                  </span>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Play Again */}
      <button className="btn-play-again" onClick={handlePlayAgain}>
        🏎️ Play Again
      </button>
    </div>
  );
}
