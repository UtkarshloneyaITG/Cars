import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { TRACKS, TRACK_WIDTH, computeTrackEdges } from '../game/track.js';

const PREVIEW_W = 200;
const PREVIEW_H = 112;
const SCALE_X = PREVIEW_W / 1280;
const SCALE_Y = PREVIEW_H / 720;

// Which tracks belong to which mode
const MODE_TRACKS = {
  race:         ['oval', 'city', 'highland'],
  cops_robbers: ['field'],
  football:     ['football'],
};

function drawTrackPreview(canvas, track) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

  if (track.type === 'football') {
    const { left, top, right, bottom } = track.bounds;
    const sl = left  * SCALE_X;
    const st = top   * SCALE_Y;
    const sw = (right - left)  * SCALE_X;
    const sh = (bottom - top)  * SCALE_Y;
    const midX = sl + sw / 2;
    const midY = st + sh / 2;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(sl, st, sw, sh);
    // Halfway line
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX, st);
    ctx.lineTo(midX, st + sh);
    ctx.stroke();
    // Centre circle
    ctx.beginPath();
    ctx.arc(midX, midY, Math.min(sw, sh) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    // Boundary (no goal openings at this scale)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sl + 1, st + 1, sw - 2, sh - 2);
    // Goal nets hint
    const gh = sh * 0.28;
    ctx.fillStyle = 'rgba(231,76,60,0.3)';
    ctx.fillRect(sl - 4, midY - gh / 2, 4, gh);
    ctx.fillStyle = 'rgba(52,152,219,0.3)';
    ctx.fillRect(sl + sw, midY - gh / 2, 4, gh);
    return;
  }

  if (track.type === 'field') {
    const { left, top, right, bottom } = track.bounds;
    const sl = left  * SCALE_X;
    const st = top   * SCALE_Y;
    const sw = (right  - left) * SCALE_X;
    const sh = (bottom - top)  * SCALE_Y;
    ctx.fillStyle = '#1e4d1e';
    ctx.fillRect(sl, st, sw, sh);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sl + 2, st + 2, sw - 4, sh - 4);
    ctx.beginPath();
    ctx.moveTo(sl + sw / 2, st + 2);
    ctx.lineTo(sl + sw / 2, st + sh - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sl + sw / 2, st + sh / 2, Math.min(sw, sh) * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const waypoints  = track.waypoints;
  const scaledWp   = waypoints.map(([x, y]) => [x * SCALE_X, y * SCALE_Y]);
  const scaledWidth = TRACK_WIDTH * ((SCALE_X + SCALE_Y) / 2);
  const { outer, inner } = computeTrackEdges(scaledWp, scaledWidth);

  ctx.save();
  ctx.fillStyle = '#2e2e3e';
  ctx.beginPath();
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
  ctx.closePath();
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = inner.length - 1; i >= 1; i--) ctx.lineTo(inner[i][0], inner[i][1]);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(inner[0][0], inner[0][1]);
  for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i][0], inner[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Start/finish line — at CP0, perpendicular to road direction
  const cps = track.checkpoints;
  if (cps && cps.length > 0 && scaledWp.length >= 2) {
    const cpX = cps[0].x * SCALE_X;
    const cpY = cps[0].y * SCALE_Y;

    // Find the waypoint nearest to CP0, use prev→next for road direction
    let closestIdx = 0, closestDist = Infinity;
    for (let i = 0; i < scaledWp.length; i++) {
      const dx = scaledWp[i][0] - cpX, dy = scaledWp[i][1] - cpY;
      const d = dx * dx + dy * dy;
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    const prev = scaledWp[(closestIdx - 1 + scaledWp.length) % scaledWp.length];
    const next = scaledWp[(closestIdx + 1) % scaledWp.length];
    const rdx  = next[0] - prev[0];
    const rdy  = next[1] - prev[1];
    const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
    // Perpendicular (across-track) normal
    const nx = -rdy / rlen;
    const ny =  rdx / rlen;
    const hw = scaledWidth / 2;

    ctx.save();
    ctx.strokeStyle = '#B8FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cpX + nx * hw, cpY + ny * hw);
    ctx.lineTo(cpX - nx * hw, cpY - ny * hw);
    ctx.stroke();
    ctx.restore();
  }
}

export default function Lobby({ sendMessage }) {
  const [chatInput, setChatInput]   = useState('');
  const [hasReadied, setHasReadied] = useState(false);
  const chatEndRef = useRef(null);

  const refOval     = useRef(null);
  const refCity     = useRef(null);
  const refHighland = useRef(null);
  const refField    = useRef(null);
  const refFootball = useRef(null);
  const canvasRefs  = { oval: refOval, city: refCity, highland: refHighland, field: refField, football: refFootball };

  const roomId        = useGameStore((s) => s.roomId);
  const roomPlayers   = useGameStore((s) => s.roomPlayers);
  const roomState     = useGameStore((s) => s.roomState);
  const countdown     = useGameStore((s) => s.countdown);
  const chatMessages  = useGameStore((s) => s.chatMessages);
  const playerId      = useGameStore((s) => s.playerId);
  const selectedMap   = useGameStore((s) => s.selectedMap);
  const selectedMode  = useGameStore((s) => s.gameMode);
  const hostId        = useGameStore((s) => s.hostId);
  const footballTeams = useGameStore((s) => s.footballTeams);
  const myTeam        = useGameStore((s) => s.myTeam);

  const visibleChat = chatMessages.slice(-10);
  const isHost = playerId === hostId;

  // Tracks available for the current mode
  const effectiveMode   = selectedMode || 'race';
  const visibleTrackIds = MODE_TRACKS[effectiveMode] ?? MODE_TRACKS.race;
  const visibleTracks   = Object.values(TRACKS).filter((t) => visibleTrackIds.includes(t.id));

  // Non-host players are auto-readied once the host is confirmed.
  // We wait for hostId to be non-null so we don't fire before the
  // server's room_update arrives (which would make the host look like
  // a non-host and auto-ready them, instantly starting the game).
  useEffect(() => {
    if (hostId && !isHost && !hasReadied) {
      sendMessage({ type: 'ready' });
      setHasReadied(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId, isHost]);

  const handleReady = () => {
    if (hasReadied) return;
    sendMessage({ type: 'ready' });
    setHasReadied(true);
  };

  const handleChatSend = (e) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    sendMessage({ type: 'chat', message: msg });
    setChatInput('');
  };

  const handleSelectMap = (mapId) => {
    if (!isHost) return;
    sendMessage({ type: 'select_map', map_id: mapId });
  };

  const handleSelectMode = (modeId) => {
    if (!isHost) return;
    sendMessage({ type: 'select_mode', mode: modeId });
    // Auto-select first available map for the new mode
    const firstMap = (MODE_TRACKS[modeId] ?? MODE_TRACKS.race)[0];
    sendMessage({ type: 'select_map', map_id: firstMap });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Redraw track previews whenever the visible set changes (mode switch)
  useEffect(() => {
    Object.values(TRACKS).forEach((track) => {
      const canvas = canvasRefs[track.id]?.current;
      if (canvas) drawTrackPreview(canvas, track);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode]);

  const allReady   = roomPlayers.length > 0 && roomPlayers.every((p) => p.ready);
  const myPlayer   = roomPlayers.find((p) => p.id === playerId);
  const amReady    = myPlayer?.ready || hasReadied;
  const isCountdown = roomState === 'countdown';

  const handleJoinTeam = (team) => {
    sendMessage({ type: 'join_team', team });
    useGameStore.getState().setMyTeam(team);
  };

  const MODES = [
    { id: 'race',         icon: '🏁', label: 'Race Mode',       desc: '3-lap circuit — first to finish wins' },
    { id: 'cops_robbers', icon: '🚔', label: 'Cops & Robbers',  desc: 'One thief vs all cops — survive longest' },
    { id: 'football',     icon: '⚽', label: 'Football',        desc: 'Score 5 goals — 2 teams, any size' },
  ];

  const isFootball = effectiveMode === 'football';
  // For football: merge teams from store (updated by room_update) with local fallback
  const redTeamIds  = footballTeams?.red  || [];
  const blueTeamIds = footballTeams?.blue || [];

  return (
    <div className="lobby">
      <div className="lobby-container">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="lobby-header">
          {isHost ? (
            <button
              className={`btn-ready ${amReady ? 'is-ready' : 'not-ready'}`}
              onClick={handleReady}
              disabled={amReady}
            >
              {amReady ? '✓ Starting…' : '🏁 Start Game'}
            </button>
          ) : (
            <div className="btn-ready is-ready" style={{ cursor: 'default', opacity: 0.7 }}>
              ✓ Ready
            </div>
          )}
          <h1 className="lobby-title">🏎 NITRO RUSH</h1>
          <div className="room-id-badge">Room: {roomId || '—'}</div>
        </div>

        {/* ── Mode selector ──────────────────────────────── */}
        <div className="lobby-mode-row">
          {MODES.map((mode) => {
            const isSelected = effectiveMode === mode.id;
            return (
              <button
                key={mode.id}
                className={`mode-card${isSelected ? ' selected' : ''}${!isHost ? ' locked' : ''}`}
                onClick={() => handleSelectMode(mode.id)}
                disabled={!isHost}
                data-mode={mode.id}
              >
                <span className="mode-card-icon">{mode.icon}</span>
                <span className="mode-card-label">{mode.label}</span>
                <span className="mode-card-desc">{mode.desc}</span>
                {!isHost && <span className="mode-card-lock">🔒</span>}
              </button>
            );
          })}
          {!isHost && (
            <div className="host-only-hint">Only the host can change mode &amp; map</div>
          )}
        </div>

        {/* ── Main content: maps (left) + sidebar (right) ─ */}
        <div className="lobby-main">

          {/* Maps panel */}
          <div className="lobby-panel lobby-maps-panel">
            <div className="panel-title">
              {effectiveMode === 'cops_robbers' ? 'Battlefield'
               : effectiveMode === 'football'  ? 'Football Pitch'
               : 'Choose Your Track'}
            </div>
            <div className={`map-grid${visibleTracks.length === 1 ? ' single' : ''}`}>
              {visibleTracks.map((track) => {
                const isSelected = selectedMap === track.id;
                return (
                  <div
                    key={track.id}
                    className={`map-card${isSelected ? ' selected' : ''}${!isHost ? ' locked' : ''}`}
                    onClick={() => handleSelectMap(track.id)}
                  >
                    {isSelected && <div className="map-voted-check">✓</div>}
                    <canvas
                      ref={canvasRefs[track.id]}
                      width={PREVIEW_W}
                      height={PREVIEW_H}
                      className="map-canvas"
                    />
                    <div className="map-card-footer">
                      <div className="map-card-name">{track.name}</div>
                      <div className="map-card-desc">{track.description}</div>
                      {isSelected && (
                        <div className="map-vote-pill selected">✓ Selected</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team picker (football only) */}
            {isFootball && (
              <div className="team-picker">
                <div className="team-picker-title">Pick Your Team</div>
                <div className="team-picker-cols">

                  {/* Red team */}
                  <div className={`team-col team-red${myTeam === 'red' ? ' my-team' : ''}`}>
                    <div className="team-col-header">
                      <span className="team-dot red" />
                      Red Team
                      <span className="team-count">{redTeamIds.length}</span>
                    </div>
                    <div className="team-player-list">
                      {redTeamIds.map((pid) => {
                        const p = roomPlayers.find((rp) => rp.id === pid);
                        return p ? (
                          <div key={pid} className="team-player-row">
                            <div className="car-icon" style={{ background: p.color || '#888', width: '12px', height: '12px' }} />
                            <span>{p.name}{pid === playerId ? ' (you)' : ''}</span>
                          </div>
                        ) : null;
                      })}
                      {redTeamIds.length === 0 && (
                        <div className="team-empty">No players yet</div>
                      )}
                    </div>
                    <button
                      className={`btn-join-team red${myTeam === 'red' ? ' joined' : ''}`}
                      onClick={() => handleJoinTeam('red')}
                    >
                      {myTeam === 'red' ? '✓ On Red Team' : 'Join Red'}
                    </button>
                  </div>

                  {/* Blue team */}
                  <div className={`team-col team-blue${myTeam === 'blue' ? ' my-team' : ''}`}>
                    <div className="team-col-header">
                      <span className="team-dot blue" />
                      Blue Team
                      <span className="team-count">{blueTeamIds.length}</span>
                    </div>
                    <div className="team-player-list">
                      {blueTeamIds.map((pid) => {
                        const p = roomPlayers.find((rp) => rp.id === pid);
                        return p ? (
                          <div key={pid} className="team-player-row">
                            <div className="car-icon" style={{ background: p.color || '#888', width: '12px', height: '12px' }} />
                            <span>{p.name}{pid === playerId ? ' (you)' : ''}</span>
                          </div>
                        ) : null;
                      })}
                      {blueTeamIds.length === 0 && (
                        <div className="team-empty">No players yet</div>
                      )}
                    </div>
                    <button
                      className={`btn-join-team blue${myTeam === 'blue' ? ' joined' : ''}`}
                      onClick={() => handleJoinTeam('blue')}
                    >
                      {myTeam === 'blue' ? '✓ On Blue Team' : 'Join Blue'}
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Players panel (middle column) */}
          <div className="lobby-panel lobby-players-panel">
            <div className="panel-title">
              Drivers
              <span className="panel-count">{roomPlayers.length} / 8</span>
            </div>
            <div className="player-list">
              {roomPlayers.length === 0 && (
                <div className="player-list-empty">Waiting for drivers…</div>
              )}
              {roomPlayers.map((p, idx) => (
                <div key={p.id} className="player-row">
                  <div className="player-slot-num">{idx + 1}</div>
                  <div className="car-icon" style={{ background: p.color || '#888', boxShadow: `0 0 8px ${p.color || '#888'}66` }} />
                  <span className={`player-name${p.id === playerId ? ' is-you' : ''}`}>{p.name}</span>
                  <span className={`ready-badge ${p.ready ? 'ready' : 'not-ready'}`}>
                    {p.ready ? '✓ Ready' : 'Waiting'}
                  </span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 8 - roomPlayers.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="player-row empty-slot">
                  <div className="player-slot-num" style={{ opacity: 0.3 }}>{roomPlayers.length + i + 1}</div>
                  <div className="car-icon" style={{ background: '#222' }} />
                  <span className="player-name" style={{ color: '#333', fontStyle: 'italic' }}>Empty slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat — full-height right column */}
          <div className="lobby-panel lobby-chat-panel">
            <div className="panel-title">Race Chat</div>
            <div className="chat-messages">
              {visibleChat.length === 0 && (
                <div style={{ color: '#444', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>No messages yet…</div>
              )}
              {visibleChat.map((msg, i) => (
                <div key={i} className="chat-msg">
                  <span
                    className="chat-name"
                    style={{ color: roomPlayers.find((p) => p.name === msg.player_name)?.color || '#e8e8f0' }}
                  >
                    {msg.player_name}:
                  </span>{' '}
                  {msg.message}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleChatSend}>
              <input
                className="chat-input"
                type="text"
                placeholder="Say something…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
              <button type="submit" className="btn-chat-send">Send</button>
            </form>
          </div>
        </div>{/* /lobby-main */}

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="lobby-footer">
          <div className="waiting-text">
            {allReady
              ? '🚀 Starting soon…'
              : isHost
                ? `Click "Start Game" when everyone has joined (${roomPlayers.length} player${roomPlayers.length !== 1 ? 's' : ''} in room)`
                : '⏳ Waiting for the host to start the game…'}
          </div>
        </div>

      </div>{/* /lobby-container */}

      {/* ── Countdown overlay ──────────────────────────── */}
      {isCountdown && countdown != null && (
        <div className="countdown-overlay">
          {countdown > 0 ? (
            <>
              <div key={countdown} className="countdown-number">{countdown}</div>
              <div className="countdown-label">GET READY</div>
            </>
          ) : (
            <div key="go" className="countdown-go">GO!</div>
          )}
        </div>
      )}
    </div>
  );
}
