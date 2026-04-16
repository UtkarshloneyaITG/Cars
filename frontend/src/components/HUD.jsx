import React from 'react';
import { useGameStore } from '../store/gameStore';
import { NUM_LAPS } from '../game/track.js';

function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '00:00.000';
  const m  = Math.floor(seconds / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatSecs(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function speedToKmh(speed) {
  if (speed == null) return 0;
  return Math.round(Math.min(200, Math.max(0, speed / 3)));
}

const POWERUP_CONFIG = {
  boost:  { color: '#FFD700', label: 'BOOST',  maxDur: 5  },
  nitro:  { color: '#00FFFF', label: 'NITRO',  maxDur: 2.5 },
  shield: { color: '#4FC3F7', label: 'SHIELD', maxDur: 7  },
  slow:   { color: '#E74C3C', label: 'SLOW',   maxDur: 4  },
};

function posClass(pos) {
  if (pos === 1) return 'p1';
  if (pos === 2) return 'p2';
  if (pos === 3) return 'p3';
  if (pos === 4) return 'p4';
  if (pos === 5) return 'p5';
  if (pos === 6) return 'p6';
  return 'p7';
}

export default function HUD() {
  const playerId      = useGameStore((s) => s.playerId);
  const gameState     = useGameStore((s) => s.gameState);
  const raceTime      = useGameStore((s) => s.raceTime);
  const notifications = useGameStore((s) => s.notifications);
  const chatMessages  = useGameStore((s) => s.chatMessages);
  const gameMode      = useGameStore((s) => s.gameMode);
  const thiefId       = useGameStore((s) => s.thiefId);
  const timeRemaining = useGameStore((s) => s.timeRemaining);

  const footballScores = useGameStore((s) => s.footballScores);
  const footballTeams  = useGameStore((s) => s.footballTeams);
  const myTeam         = useGameStore((s) => s.myTeam);
  const kickoffPending = useGameStore((s) => s.kickoffPending);

  const players     = gameState?.players || [];
  const myPlayer    = players.find((p) => p.id === playerId);
  const isCops      = gameMode === 'cops_robbers';
  const isFootball  = gameMode === 'football';

  const myPos       = myPlayer?.race_position ?? '?';
  const myLap       = myPlayer?.lap ?? 1;
  const mySpeed     = myPlayer?.speed ?? 0;
  const myDrift     = myPlayer?.drift ?? 0;
  const myHealth    = myPlayer?.health ?? 100;
  const respawning  = myPlayer?.respawning ?? false;
  const respawnTimer = myPlayer?.respawn_timer ?? 0;
  const activePU    = myPlayer?.active_powerup;
  const puTimer     = myPlayer?.powerup_timer ?? 0;
  const amThief     = myPlayer?.id === thiefId;

  const recentChat = chatMessages.slice(-5);
  const puConfig = activePU ? (POWERUP_CONFIG[activePU] || { color: '#fff', label: activePU.toUpperCase(), maxDur: 5 }) : null;
  const puFillPct = puConfig && puConfig.maxDur > 0 ? Math.max(0, Math.min(1, puTimer / puConfig.maxDur)) * 100 : 0;

  // Football team for myPlayer
  const myFootballTeam = myTeam || (footballTeams?.red?.includes(playerId) ? 'red'
                                  : footballTeams?.blue?.includes(playerId) ? 'blue' : null);

  // Leaderboard sort
  const sortedRace  = [...players].sort((a, b) => (a.race_position ?? 99) - (b.race_position ?? 99));
  const sortedCops  = [...players].sort((a, b) => (b.thief_time ?? 0) - (a.thief_time ?? 0));
  const sorted      = isCops ? sortedCops : sortedRace;

  return (
    <div className="hud">

      {/* TOP LEFT */}
      <div className="hud-top-left">
        {isCops ? (
          <div className="hud-panel" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontSize: '1.4rem',
              background: amThief ? 'rgba(231,76,60,0.25)' : 'rgba(52,152,219,0.25)',
              border: `1px solid ${amThief ? '#e74c3c' : '#3498db'}`,
              borderRadius: '8px',
              padding: '4px 10px',
              color: amThief ? '#e74c3c' : '#3498db',
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
            }}>
              {amThief ? '🦹 THIEF' : '👮 COP'}
            </div>
          </div>
        ) : isFootball ? (
          <div className="hud-panel" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontSize: '1.1rem',
              background: myFootballTeam === 'red' ? 'rgba(231,76,60,0.25)' : myFootballTeam === 'blue' ? 'rgba(52,152,219,0.25)' : 'rgba(100,100,100,0.2)',
              border: `1px solid ${myFootballTeam === 'red' ? '#e74c3c' : myFootballTeam === 'blue' ? '#3498db' : '#666'}`,
              borderRadius: '8px',
              padding: '4px 10px',
              color: myFootballTeam === 'red' ? '#e74c3c' : myFootballTeam === 'blue' ? '#3498db' : '#aaa',
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
            }}>
              {myFootballTeam === 'red' ? '🔴 RED TEAM' : myFootballTeam === 'blue' ? '🔵 BLUE TEAM' : '⚽ FOOTBALL'}
            </div>
          </div>
        ) : (
          <div className="hud-panel" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`position-badge ${posClass(myPos)}`}>P{myPos}</span>
            <div>
              <div className="lap-counter">LAP <span>{Math.min(myLap, NUM_LAPS)}</span>/{NUM_LAPS}</div>
              <div style={{ fontSize: '0.7rem', color: '#8888aa', fontFamily: 'Courier New, monospace' }}>
                {myPlayer?.checkpoint != null ? `CP ${myPlayer.checkpoint + 1}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOP CENTER */}
      <div className="hud-top-center">
        {isFootball ? (
          <div className="football-scoreboard hud-panel">
            <div className="football-score-team red">
              <span className="football-team-label">🔴 RED</span>
              <span className="football-score-num">{footballScores?.red ?? 0}</span>
            </div>
            <div className="football-score-sep">—</div>
            <div className="football-score-team blue">
              <span className="football-score-num">{footballScores?.blue ?? 0}</span>
              <span className="football-team-label">BLUE 🔵</span>
            </div>
            {kickoffPending && (
              <div className="football-kickoff-banner">⚽ GOAL!</div>
            )}
          </div>
        ) : isCops ? (
          <div className="hud-panel" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#8888aa', letterSpacing: '0.1em', marginBottom: '2px' }}>TIME LEFT</div>
            <div className="race-timer mono" style={{
              color: timeRemaining < 30 ? '#e74c3c' : '#e8e8f0',
              fontSize: timeRemaining < 30 ? '1.6rem' : '1.3rem',
            }}>
              {formatSecs(timeRemaining)}
            </div>
          </div>
        ) : (
          <div className="hud-panel race-timer mono">{formatTime(raceTime)}</div>
        )}
      </div>

      {/* TOP RIGHT — Speedometer + Drift + Health */}
      <div className="hud-top-right">
        <div className="hud-panel speedometer">
          {/* Speed always shown */}
          <span className="speed-value">{speedToKmh(mySpeed).toString().padStart(3, '\u2007')}</span>
          <span className="speed-unit">km/h</span>
          <div style={{ width: '64px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${Math.min(100, speedToKmh(mySpeed) / 2)}%`,
              height: '100%',
              background: speedToKmh(mySpeed) > 160 ? '#e63946' : speedToKmh(mySpeed) > 100 ? '#FFD700' : '#2ecc71',
              borderRadius: '2px',
              transition: 'width 0.1s linear',
            }} />
          </div>
        </div>

        {/* Drift meter — race mode only */}
        {!isCops && !isFootball && (
          <div className="hud-panel hud-drift-meter">
            <div className="hud-meter-label">DRIFT</div>
            <div className="hud-meter-bar">
              <div
                className="hud-meter-fill"
                style={{
                  width: `${Math.round(myDrift * 100)}%`,
                  background: myDrift > 0.6
                    ? 'linear-gradient(90deg, #e67e22, #e63946)'
                    : myDrift > 0.3
                    ? 'linear-gradient(90deg, #3498db, #e67e22)'
                    : '#3498db',
                  boxShadow: myDrift > 0.3 ? `0 0 6px ${myDrift > 0.6 ? '#e63946' : '#e67e22'}` : 'none',
                }}
              />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#8888aa', fontFamily: 'Courier New, monospace', textAlign: 'right' }}>
              {Math.round(myDrift * 100)}%
            </div>
          </div>
        )}

        {/* Health bar — race mode only */}
        {!isCops && !isFootball && (
          <div className="hud-panel hud-health-panel">
            <div className="hud-meter-label">HEALTH</div>
            <div className="hud-meter-bar">
              <div
                className="hud-meter-fill"
                style={{
                  width: `${myHealth}%`,
                  background: myHealth > 60
                    ? 'linear-gradient(90deg, #27ae60, #2ecc71)'
                    : myHealth > 30
                    ? 'linear-gradient(90deg, #e67e22, #f39c12)'
                    : 'linear-gradient(90deg, #c0392b, #e63946)',
                  boxShadow: myHealth < 30 ? '0 0 8px #e63946' : 'none',
                  transition: 'width 0.2s linear, background 0.3s',
                }}
              />
            </div>
            {respawning && (
              <div style={{
                fontSize: '0.65rem',
                color: '#e63946',
                fontFamily: 'Courier New, monospace',
                textAlign: 'right',
                animation: 'pulse 0.5s ease infinite',
              }}>
                RESPAWN {respawnTimer.toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM LEFT — Standings + Powerup + Chat */}
      <div className="hud-bottom-left">

        {/* Leaderboard */}
        <div className="hud-panel leaderboard">
          <div className="leaderboard-title">
            {isCops ? '⏱ Thief Time' : isFootball ? '⚽ Teams' : 'Standings'}
          </div>
          {isFootball ? (
            // Football: show team rosters
            ['red', 'blue'].map((team) => {
              const teamPlayers = players.filter((p) =>
                footballTeams?.[team]?.includes(p.id)
              );
              return (
                <div key={team} style={{ marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: team === 'red' ? '#e74c3c' : '#3498db', fontWeight: 700, marginBottom: '2px' }}>
                    {team === 'red' ? '🔴 RED' : '🔵 BLUE'} — {footballScores?.[team] ?? 0} goal{(footballScores?.[team] ?? 0) !== 1 ? 's' : ''}
                  </div>
                  {teamPlayers.map((p) => (
                    <div key={p.id} className={`lb-row${p.id === playerId ? ' is-me' : ''}`}>
                      <div className="lb-dot" style={{ background: p.color || '#888' }} />
                      <span className="lb-name" title={p.name}>{p.name}</span>
                    </div>
                  ))}
                  {teamPlayers.length === 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#444', fontStyle: 'italic', paddingLeft: '4px' }}>Empty</div>
                  )}
                </div>
              );
            })
          ) : (
            sorted.map((p, idx) => {
              const isMe = p.id === playerId;
              const isThief = p.id === thiefId;
              return (
                <div key={p.id} className={`lb-row${isMe ? ' is-me' : ''}`}>
                  <span className={`lb-pos ${posClass(idx + 1)}`}>{idx + 1}</span>
                  <div className="lb-dot" style={{ background: p.color || '#888' }} />
                  <span className="lb-name" title={p.name}>{p.name}</span>
                  <span className="lb-info" style={{ color: isThief ? '#e74c3c' : undefined }}>
                    {isCops
                      ? (isThief ? `🦹 ${(p.thief_time ?? 0).toFixed(1)}s` : `${(p.thief_time ?? 0).toFixed(1)}s`)
                      : (p.finished ? '✓' : `L${Math.min(p.lap ?? 1, NUM_LAPS)}`)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Active power-up (race mode only) */}
        {!isCops && activePU && puConfig && (
          <div className="hud-panel powerup-display" style={{ borderColor: puConfig.color + '55' }}>
            <div className="powerup-label">Active Power-Up</div>
            <div className="powerup-name" style={{ color: puConfig.color, textShadow: `0 0 8px ${puConfig.color}` }}>
              {puConfig.label}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8888aa', fontFamily: 'monospace' }}>{puTimer.toFixed(1)}s remaining</div>
            <div className="powerup-timer-bar">
              <div className="powerup-timer-fill" style={{ width: `${puFillPct}%`, background: puConfig.color, boxShadow: `0 0 6px ${puConfig.color}` }} />
            </div>
          </div>
        )}

        {/* Chat overlay */}
        {recentChat.length > 0 && (
          <div className="hud-chat">
            {recentChat.map((msg, i) => (
              <div key={i} className="hud-chat-msg">
                <span className="chat-name">{msg.player_name}: </span>
                {msg.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CENTER — Notifications */}
      <div className="hud-bottom-center">
        <div className="notifications">
          {notifications.map((n) => (
            <div key={n.id} className="notification" style={{
              background: `${n.color}22`,
              border: `1px solid ${n.color}66`,
              color: n.color,
              boxShadow: `0 0 12px ${n.color}44`,
            }}>
              {n.text}
            </div>
          ))}
        </div>
      </div>

      <div className="hud-bottom-right" />
    </div>
  );
}
