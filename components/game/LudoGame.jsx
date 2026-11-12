'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '@/store/gameStore';
import useAuthStore from '@/store/authStore';
import LudoBoard from './LudoBoard';
import Dice from './Dice';
import PlayerPanel from './PlayerPanel';
import GameEventLog from './GameEventLog';
import { getSocket } from '@/lib/socket/socket';
import { toast } from '@/store/toastStore';
import { useParams } from 'next/navigation';

const COLOR_LABEL = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };
const COLOR_BG = {
  red: 'bg-red-500/20 border-red-500/40 text-red-400',
  green: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
};

export default function LudoGame() {
  const { roomId } = useParams();
  const { gameState, myColor, diceValue, movableTokens, isMyTurn } = useGameStore();
  const { user } = useAuthStore();
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (!isMyTurn || rolling || gameState?.diceRolled) return;
    setRolling(true);
    const socket = getSocket();
    socket.emit('dice:roll', { roomId });
    // Clear after a reasonable animation window
    setTimeout(() => setRolling(false), 1000);
  };

  const handleTokenClick = (tokenId) => {
    if (!isMyTurn || !gameState?.diceRolled) return;
    if (!movableTokens.includes(tokenId)) {
      toast.warning('This token cannot move');
      return;
    }
    const socket = getSocket();
    socket.emit('token:move', { roomId, tokenId });
  };

  const currentPlayerState = gameState?.players?.find(p => p.color === gameState?.currentTurn);

  return (
    <div className="min-h-screen bg-gaming-gradient">
      <div className="max-w-7xl mx-auto p-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-display">Ludo Arena</h1>
            <p className="text-xs text-slate-400">Room: {roomId}</p>
          </div>
          {/* Current turn indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${COLOR_BG[gameState?.currentTurn] || ''}`}>
            <div className={`w-2 h-2 rounded-full bg-current animate-pulse`} />
            <span className="text-sm font-medium">
              {gameState?.currentTurn === myColor ? "Your turn!" : `${COLOR_LABEL[gameState?.currentTurn]}'s turn`}
            </span>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Player panels */}
          <div className="xl:w-56 flex xl:flex-col gap-3 order-3 xl:order-1">
            {['red', 'green'].map(color => (
              <PlayerPanel key={color} color={color} gameState={gameState} myColor={myColor} />
            ))}
          </div>

          {/* Center: Board */}
          <div className="flex-1 flex flex-col items-center gap-6 order-1 xl:order-2">
            <LudoBoard
              gameState={gameState}
              myColor={myColor}
              movableTokens={movableTokens}
              onTokenClick={handleTokenClick}
            />

            {/* Dice area */}
            <div className="game-card p-6 flex flex-col items-center gap-3">
              <Dice
                value={diceValue}
                isMyTurn={isMyTurn}
                isRolling={rolling}
                onRoll={handleRoll}
                diceRolled={gameState?.diceRolled}
              />
              {gameState?.diceRolled && isMyTurn && movableTokens.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-purple-400 animate-pulse"
                >
                  Click a highlighted token to move
                </motion.p>
              )}
            </div>
          </div>

          {/* Right: Player panels + Event log */}
          <div className="xl:w-56 flex xl:flex-col gap-3 order-2 xl:order-3">
            {['yellow', 'blue'].map(color => (
              <PlayerPanel key={color} color={color} gameState={gameState} myColor={myColor} />
            ))}
            <GameEventLog />
          </div>
        </div>
      </div>
    </div>
  );
}
