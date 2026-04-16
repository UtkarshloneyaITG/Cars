import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const WS_URL = 'wss://cars-5dow.onrender.com/ws';
const RECONNECT_DELAY = 3000;

let wsInstance = null;
let reconnectTimer = null;

export default function useWebSocket() {
  const wsRef = useRef(null);
  const mountedRef = useRef(true);

  const store = useGameStore.getState;

  const {
    setConnected,
    setPlayerId,
    setPlayerSlot,
    setCarColor,
    setRoomId,
    setRoomPlayers,
    setRoomState,
    setGameState,
    setCountdown,
    setRaceTime,
    addNotification,
    addChatMessage,
    setRaceResults,
  } = useGameStore.getState();

  const handleMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.error('Failed to parse WS message:', e);
      return;
    }

    const {
      setConnected: _sc,
      setPlayerId: _spid,
      setPlayerSlot: _sps,
      setCarColor: _scc,
      setRoomId: _sri,
      setRoomPlayers: _srp,
      setRoomState: _srs,
      setGameState: _sgs,
      setCountdown: _scd,
      setRaceTime: _srt,
      addNotification: _an,
      addChatMessage: _acm,
      setRaceResults: _srr,
      setMapVotes: _smv,
      setModeVotes: _smodv,
      setGameMode: _sgm,
      setCopsState: _scs,
      setFootballState: _sfs,
      playerId,
    } = useGameStore.getState();

    switch (msg.type) {
      case 'room_joined':
        _spid(msg.player_id);
        _sps(msg.player_slot);
        _scc(msg.car_color);
        _sri(msg.room_id);
        _srs('waiting');
        break;

      case 'room_update':
        _srp(msg.players || []);
        _srs(msg.state);
        if (msg.game_mode)    _sgm(msg.game_mode);
        if (msg.host_id)      useGameStore.getState().setHostId(msg.host_id);
        if (msg.selected_map) useGameStore.getState().setMapVotes({}, msg.selected_map);
        if (msg.teams)        useGameStore.getState().setFootballState(
          useGameStore.getState().footballScores,
          msg.teams,
          useGameStore.getState().ball,
          useGameStore.getState().kickoffPending,
        );
        break;

      case 'countdown':
        _scd(msg.count);
        _srs('countdown');
        break;

      case 'race_start':
        _srs('racing');
        _scd(null);
        if (msg.game_mode) _sgm(msg.game_mode);
        break;

      case 'game_state':
        _sgs(msg);
        _srt(msg.race_time || 0);
        if (msg.game_mode === 'cops_robbers') {
          _scs(msg.thief_id, msg.game_elapsed || 0, msg.game_duration || 120, msg.time_remaining || 0);
        }
        if (msg.game_mode === 'football') {
          _sfs(
            msg.scores || { red: 0, blue: 0 },
            msg.teams  || { red: [], blue: [] },
            msg.ball   || null,
            msg.kickoff_pending || false,
          );
        }
        break;

      case 'lap_complete': {
        const lapTime = msg.lap_time != null ? msg.lap_time.toFixed(2) : '?';
        _an(`🏁 ${msg.player_name} — Lap ${msg.lap}! ${lapTime}s`, '#2ECC71');
        break;
      }

      case 'player_finished': {
        const finishTime = msg.finish_time != null ? msg.finish_time.toFixed(2) : '?';
        _an(`🏆 ${msg.player_name} finished! ${finishTime}s`, '#F1C40F');
        break;
      }

      case 'race_finish':
        _srr(msg.results);
        _srs('finished');
        // For football, stamp the final scores into the store so the
        // scoreboard always shows the correct result regardless of timing.
        if (msg.mode === 'football' && msg.scores) {
          _sfs(
            msg.scores,
            useGameStore.getState().footballTeams,
            null,
            false,
          );
        }
        break;

      case 'powerup_collected': {
        const currentPlayerId = useGameStore.getState().playerId;
        if (msg.player_id === currentPlayerId) {
          const typeLabel = msg.powerup_type
            ? msg.powerup_type.toUpperCase()
            : 'POWER-UP';
          _an(`⚡ ${typeLabel} activated!`, '#FFD700');
        }
        break;
      }

      case 'thief_tagged': {
        const currentPlayerId = useGameStore.getState().playerId;
        if (msg.new_thief_id === currentPlayerId) {
          _an('🚨 YOU ARE THE THIEF! Run!', '#E74C3C');
        } else if (msg.old_thief_id === currentPlayerId) {
          _an(`✅ You tagged ${msg.new_thief_name}! Now you're a cop.`, '#3498DB');
        } else {
          _an(`🚨 ${msg.new_thief_name} is now the THIEF!`, '#E74C3C');
        }
        break;
      }

      case 'ball_reset': {
        _an('⚽ Ball reset to centre', '#B8FF00');
        break;
      }

      case 'goal_scored': {
        const scoringTeam = msg.team === 'red' ? '🔴 Red' : '🔵 Blue';
        _an(`⚽ ${scoringTeam} Team scored! ${msg.scores?.red ?? 0} — ${msg.scores?.blue ?? 0}`,
            msg.team === 'red' ? '#e74c3c' : '#3498db');
        _sfs(
          msg.scores || { red: 0, blue: 0 },
          useGameStore.getState().footballTeams,
          useGameStore.getState().ball,
          true,
        );
        break;
      }

      case 'chat_message':
        _acm({ player_name: msg.player_name, message: msg.message });
        break;

      case 'error':
        console.error('Server error:', msg);
        break;

      default:
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    wsInstance = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      useGameStore.getState().setConnected(true);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      if (!mountedRef.current) return;
      useGameStore.getState().setConnected(false);
      wsRef.current = null;
      wsInstance = null;
      // Attempt reconnect
      reconnectTimer = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [handleMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
        wsInstance = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }, []);

  const connected = useGameStore((s) => s.connected);

  return { sendMessage, connected };
}
