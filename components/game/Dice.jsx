'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DOTS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function DiceFace({ value, size = 80, isRolling, disabled }) {
  const dots = DOTS[value] || DOTS[1];

  return (
    <div
      className={`relative select-none ${disabled ? 'opacity-40' : ''} ${isRolling ? 'dice-rolling' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        {/* Dice body */}
        <defs>
          <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <filter id="diceShadow">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.4)" />
          </filter>
        </defs>

        {/* Shadow layer */}
        <rect x="5" y="8" width="90" height="90" rx="18" fill="rgba(0,0,0,0.25)" />

        {/* Main face */}
        <rect
          x="2" y="2" width="90" height="90" rx="16"
          fill="url(#diceGrad)"
          filter="url(#diceShadow)"
        />

        {/* Top edge highlight */}
        <rect x="4" y="2" width="86" height="6" rx="14" fill="rgba(255,255,255,0.6)" />

        {/* Dots */}
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r="9"
            fill="#1e293b"
          />
        ))}
      </svg>
    </div>
  );
}

export default function Dice({ value, isMyTurn, isRolling, onRoll, diceRolled }) {
  const canRoll = isMyTurn && !diceRolled && !isRolling;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.div
          animate={isRolling ? {
            rotateX: [0, 180, 360, 540, 720],
            rotateY: [0, 90, 180, 270, 360],
          } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ perspective: 300 }}
        >
          <DiceFace
            value={value || 1}
            size={80}
            isRolling={isRolling}
            disabled={!isMyTurn}
          />
        </motion.div>

        {/* Glow when it's your turn */}
        {isMyTurn && !diceRolled && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Value label */}
      {value && (
        <motion.div
          key={value}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-black text-white font-display"
        >
          {value}
        </motion.div>
      )}

      {/* Roll button */}
      <motion.button
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
          ${canRoll
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-glow-purple cursor-pointer'
            : 'bg-white/10 text-slate-500 cursor-not-allowed'
          }`}
        whileTap={canRoll ? { scale: 0.95 } : {}}
        animate={canRoll ? {
          boxShadow: ['0 0 10px rgba(139,92,246,0.3)', '0 0 20px rgba(139,92,246,0.6)', '0 0 10px rgba(139,92,246,0.3)']
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {isRolling ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Rolling...
          </span>
        ) : canRoll ? 'Roll Dice' : diceRolled ? 'Select Token' : 'Waiting...'}
      </motion.button>
    </div>
  );
}
