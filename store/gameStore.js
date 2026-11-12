import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  room: null,
  gameState: null,
  myColor: null,
  diceValue: null,
  movableTokens: [],
  isRolling: false,
  isMyTurn: false,
  gameFinished: false,
  winner: null,
  recentEvents: [],

  setRoom: (room) => set({ room }),

  setGameState: (gameState) => {
    set({ gameState });
    // Recompute isMyTurn
    const myColor = get().myColor;
    if (myColor && gameState) {
      set({ isMyTurn: gameState.currentTurn === myColor });
    }
  },

  setMyColor: (color) => {
    set({ myColor: color });
    const gameState = get().gameState;
    if (gameState) {
      set({ isMyTurn: gameState.currentTurn === color });
    }
  },

  setDiceResult: (value, movable) => set({ diceValue: value, movableTokens: movable, isRolling: false }),

  setRolling: (val) => set({ isRolling: val }),

  setMovableTokens: (tokens) => set({ movableTokens: tokens }),

  clearMovableTokens: () => set({ movableTokens: [], diceValue: null }),

  addEvent: (event) =>
    set((state) => ({
      recentEvents: [event, ...state.recentEvents].slice(0, 20),
    })),

  setGameFinished: (winner) => set({ gameFinished: true, winner }),

  reset: () =>
    set({
      room: null,
      gameState: null,
      myColor: null,
      diceValue: null,
      movableTokens: [],
      isRolling: false,
      isMyTurn: false,
      gameFinished: false,
      winner: null,
      recentEvents: [],
    }),
}));

export default useGameStore;
