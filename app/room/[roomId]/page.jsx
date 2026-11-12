'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import useGameStore from '@/store/gameStore';
import api from '@/lib/api/axios';
import { connectSocket, getSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import WaitingRoom from '@/components/game/WaitingRoom';
import LudoGame from '@/components/game/LudoGame';
import GameResult from '@/components/game/GameResult';

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { room, gameState, myColor, setRoom, setGameState, setMyColor, setDiceResult,
          addEvent, setGameFinished, gameFinished, reset } = useGameStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    initRoom();
    return () => cleanup();
  }, [roomId, user]);

  const initRoom = async () => {
    try {
      // Load room from API (handles reconnect)
      const { data } = await api.post(`/rooms/${roomId}/reconnect`);
      const roomData = data.data.room;
      const gsData = data.data.gameState;

      setRoom(roomData);
      if (gsData) setGameState(gsData);

      // Determine my color
      const mySlot = roomData.players?.find(
        (p) => p.user?._id?.toString() === user._id?.toString() ||
               p.user?.toString() === user._id?.toString()
      );
      if (mySlot) setMyColor(mySlot.color);

      // Connect socket
      const socket = connectSocket();
      setupSocketListeners(socket);
      socket.emit('room:join', { roomId });
    } catch (err) {
      toast.error('Failed to load room');
      router.push('/matches');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = (socket) => {
    socket.off('room:updated');
    socket.off('game:start');
    socket.off('game:state');
    socket.off('dice:result');
    socket.off('token:moved');
    socket.off('game:finished');
    socket.off('game:turn-changed');
    socket.off('player:connected');
    socket.off('player:disconnected');

    socket.on('room:updated', ({ room }) => {
      setRoom(room);
    });

    socket.on('game:start', ({ room, gameState }) => {
      setRoom(room);
      setGameState(gameState);
      toast.info('Game started! Good luck!');
    });

    socket.on('game:state', (gs) => {
      setGameState(gs);
    });

    socket.on('dice:result', ({ diceValue, color, movableTokens, autoSkip, forfeit }) => {
      const { myColor, setDiceResult } = useGameStore.getState();
      if (color === myColor) {
        // My dice result — update movable tokens too
        setDiceResult(diceValue, movableTokens || []);
      } else {
        // Other player's dice — update value only, no movable tokens
        setDiceResult(diceValue, []);
      }
      if (autoSkip) addEvent({ type: 'skip', color });
      if (forfeit) addEvent({ type: 'forfeit', color });
    });

    socket.on('token:moved', ({ events, newState }) => {
      setGameState(newState);
      events?.forEach((e) => addEvent(e));
    });

    socket.on('game:finished', ({ winnerColor, winnerId }) => {
      setGameFinished({ winnerColor, winnerId });
      toast.success(
        winnerColor === useGameStore.getState().myColor
          ? '🎉 You won!'
          : `${winnerColor} wins!`
      );
    });

    socket.on('game:turn-changed', ({ color }) => {
      addEvent({ type: 'turn_changed', color });
    });

    socket.on('player:connected', ({ username }) => {
      addEvent({ type: 'connected', username });
    });

    socket.on('player:disconnected', ({ username }) => {
      toast.warning(`${username} disconnected`);
      addEvent({ type: 'disconnected', username });
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
    });
  };

  const cleanup = () => {
    const socket = getSocket();
    socket?.emit('room:leave', { roomId });
    reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading room...</p>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return <GameResult />;
  }

  if (!gameState || gameState.status === 'waiting' || room?.status === 'waiting' || room?.status === 'full') {
    return <WaitingRoom />;
  }

  return <LudoGame />;
}
