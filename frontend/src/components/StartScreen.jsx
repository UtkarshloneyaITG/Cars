import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function StartScreen({ sendMessage, connected }) {
  const [tab, setTab]             = useState('create'); // 'create' | 'join'
  const [playerName, setPlayerName] = useState('');
  const [rooms, setRooms]         = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError]         = useState('');

  const setLastJoinInfo = useGameStore((s) => s.setLastJoinInfo);

  // ── Fetch room list ──────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    setError('');
    try {
      const res = await fetch(`${API}/rooms`);
      const data = await res.json();
      setRooms(data);
      // If selected room is gone, deselect
      if (selectedRoom && !data.find((r) => r.room_id === selectedRoom)) {
        setSelectedRoom(null);
      }
    } catch {
      setError('Could not reach server.');
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedRoom]);

  // Auto-fetch when switching to join tab
  useEffect(() => {
    if (tab === 'join') fetchRooms();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────
  const handleCreate = (e) => {
    e.preventDefault();
    if (!connected) return;
    const name = playerName.trim() || `Driver${Math.floor(Math.random() * 999)}`;
    setLastJoinInfo(name, '');
    sendMessage({ type: 'create_room', player_name: name });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!connected || !selectedRoom) return;
    const name = playerName.trim() || `Driver${Math.floor(Math.random() * 999)}`;
    setLastJoinInfo(name, selectedRoom);
    sendMessage({ type: 'join_room', room_id: selectedRoom, player_name: name });
  };

  return (
    <div className="start-screen">
      {/* Background lines */}
      <div className="start-screen-bg" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="track-line" style={{
            top: `${10 + i * 12}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + i * 0.5}s`,
          }} />
        ))}
      </div>

      {/* Decorative cars */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '15%', left: 0,
        animation: 'carZoom 6s linear infinite', animationDelay: '1s',
        fontSize: '2.5rem', opacity: 0.12, pointerEvents: 'none',
      }}>🏎️</div>
      <div aria-hidden="true" style={{
        position: 'absolute', top: '78%', left: 0,
        animation: 'carZoom 9s linear infinite', animationDelay: '4s',
        fontSize: '2rem', opacity: 0.08, pointerEvents: 'none',
      }}>🚗</div>

      {/* Title */}
      <h1 className="game-title">🏎️ NITRO RUSH</h1>
      <p className="game-subtitle">Multiplayer Racing · Up to 7 Players</p>

      {/* Main card */}
      <div className="start-card">

        {/* Tab row */}
        <div className="start-tabs">
          <button
            className={`start-tab${tab === 'create' ? ' active' : ''}`}
            onClick={() => setTab('create')}
          >
            ＋ Create Room
          </button>
          <button
            className={`start-tab${tab === 'join' ? ' active' : ''}`}
            onClick={() => setTab('join')}
          >
            🔍 Browse Rooms
          </button>
        </div>

        {/* Shared name field */}
        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
          <label className="form-label" htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            className="form-input"
            type="text"
            placeholder="Enter driver name…"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            autoFocus
            autoComplete="off"
          />
        </div>

        {/* ── CREATE TAB ── */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p className="start-hint">
              A unique room code will be generated automatically.<br />
              Share it with friends so they can join you.
            </p>
            <button type="submit" className="btn-join" disabled={!connected}>
              {connected ? '🏁 Create Room' : 'Connecting…'}
            </button>
          </form>
        )}

        {/* ── JOIN TAB ── */}
        {tab === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Room browser header */}
            <div className="room-browser-header">
              <span className="form-label" style={{ margin: 0 }}>Available Rooms</span>
              <button
                type="button"
                className="btn-refresh"
                onClick={fetchRooms}
                disabled={loadingRooms}
              >
                {loadingRooms ? '…' : '↻ Refresh'}
              </button>
            </div>

            {/* Room list */}
            <div className="room-list">
              {error && <div className="room-list-msg error">{error}</div>}
              {!error && !loadingRooms && rooms.length === 0 && (
                <div className="room-list-msg">No open rooms — be the first to create one!</div>
              )}
              {loadingRooms && rooms.length === 0 && (
                <div className="room-list-msg">Loading rooms…</div>
              )}
              {rooms.map((room) => {
                const full = room.player_count >= room.max_players;
                const isSel = selectedRoom === room.room_id;
                return (
                  <button
                    key={room.room_id}
                    className={`room-row${isSel ? ' selected' : ''}${full ? ' full' : ''}`}
                    onClick={() => !full && setSelectedRoom(isSel ? null : room.room_id)}
                    disabled={full}
                  >
                    <span className="room-code">{room.room_id}</span>
                    <span className="room-players">
                      {room.players.slice(0, 3).join(', ')}
                      {room.players.length > 3 ? ` +${room.players.length - 3}` : ''}
                    </span>
                    <span className={`room-count${full ? ' full' : ''}`}>
                      {room.player_count}/{room.max_players}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="btn-join"
              disabled={!connected || !selectedRoom}
              onClick={handleJoin}
            >
              {selectedRoom ? `🚀 Join ${selectedRoom}` : 'Select a Room'}
            </button>
          </div>
        )}
      </div>

      {/* Controls legend */}
      <div className="controls-legend">
        {[
          ['W', '↑', 'Throttle'],
          ['S', '↓', 'Brake'],
          ['A', '←', 'Steer Left'],
          ['D', '→', 'Steer Right'],
          ['Space', null, 'Handbrake'],
        ].map(([k1, k2, label]) => (
          <div key={label} className="control-item">
            <span className="key-badge">{k1}</span>
            {k2 && <><span>/</span><span className="key-badge">{k2}</span></>}
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Connection status */}
      <div className="connection-status">
        <div className={`status-dot ${connected ? 'connected' : ''}`} />
        <span>{connected ? 'Connected' : 'Connecting…'}</span>
      </div>
    </div>
  );
}
