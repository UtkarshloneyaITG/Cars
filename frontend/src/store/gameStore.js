import { create } from 'zustand';

let notificationIdCounter = 0;

const initialState = {
  // Connection
  connected: false,
  playerId: null,
  playerSlot: null,
  carColor: null,

  // Room
  roomId: null,
  roomPlayers: [],
  roomState: 'idle',
  hostId: null,

  // Race
  gameState: null,
  countdown: null,
  raceTime: 0,
  notifications: [],
  chatMessages: [],
  raceResults: null,

  // Player join info (needed for reconnect)
  lastPlayerName: '',
  lastRoomId: 'room1',

  // Map selection
  mapVotes: { oval: 0, city: 0, highland: 0, field: 0 },
  selectedMap: 'oval',
  myMapVote: null,

  // Game mode selection
  gameMode: 'race',              // 'race' | 'cops_robbers'
  modeVotes: { race: 0, cops_robbers: 0 },
  myModeVote: null,

  // Cops & Robbers live state
  thiefId: null,
  gameElapsed: 0,
  gameDuration: 120,
  timeRemaining: 120,

  // Football live state
  footballScores: { red: 0, blue: 0 },
  footballTeams:  { red: [], blue: [] },   // player_id lists
  myTeam: null,          // 'red' | 'blue' | null
  ball: null,            // { x, y, vx, vy, radius }
  kickoffPending: false,
};

export const useGameStore = create((set, get) => ({
  ...initialState,

  setConnected: (val) => set({ connected: val }),
  setPlayerId: (val) => set({ playerId: val }),
  setPlayerSlot: (val) => set({ playerSlot: val }),
  setCarColor: (val) => set({ carColor: val }),

  setRoomId: (val) => set({ roomId: val }),
  setRoomPlayers: (players) => set({ roomPlayers: players }),
  setRoomState: (state) => set({ roomState: state }),
  setHostId: (id) => set({ hostId: id }),

  setGameState: (gs) => set({ gameState: gs }),
  setCountdown: (count) => set({ countdown: count }),
  setRaceTime: (t) => set({ raceTime: t }),

  addNotification: (text, color = '#e8e8f0') => {
    const id = ++notificationIdCounter;
    set((state) => ({
      notifications: [...state.notifications, { id, text, color }],
    }));
    setTimeout(() => { get().clearNotification(id); }, 3000);
  },

  clearNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), msg],
    }));
  },

  setRaceResults: (results) => set({ raceResults: results }),
  setLastJoinInfo: (playerName, roomId) => set({ lastPlayerName: playerName, lastRoomId: roomId }),

  setMapVotes: (votes, leading) => set({ mapVotes: votes, selectedMap: leading }),
  setMyMapVote: (mapId) => set({ myMapVote: mapId }),

  setModeVotes: (votes, leading) => set({ modeVotes: votes, gameMode: leading }),
  setMyModeVote: (mode) => set({ myModeVote: mode }),
  setGameMode: (mode) => set({ gameMode: mode }),

  setCopsState: (thiefId, gameElapsed, gameDuration, timeRemaining) =>
    set({ thiefId, gameElapsed, gameDuration, timeRemaining }),

  setFootballState: (scores, teams, ball, kickoffPending) =>
    set({ footballScores: scores, footballTeams: teams, ball, kickoffPending }),

  setMyTeam: (team) => set({ myTeam: team }),

  reset: () => set((state) => ({
    ...initialState,
    connected: state.connected,
    lastPlayerName: state.lastPlayerName,
    lastRoomId: state.lastRoomId,
    myMapVote: null,
    myModeVote: null,
    myTeam: null,
  })),
}));

export default useGameStore;
