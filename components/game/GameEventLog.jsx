'use client';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '@/store/gameStore';

const COLOR_LABEL = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };

const eventLabel = (event) => {
  switch (event.type) {
    case 'token_moved': return `${COLOR_LABEL[event.color]} moved a token`;
    case 'token_entered': return `${COLOR_LABEL[event.color]} entered the board`;
    case 'token_finished': return `${COLOR_LABEL[event.color]} finished a token! 🎉`;
    case 'token_captured': return `${COLOR_LABEL[event.byColor]} captured ${COLOR_LABEL[event.capturedColor]}!`;
    case 'turn_changed': return `${COLOR_LABEL[event.nextColor]}'s turn`;
    case 'extra_turn': return `${COLOR_LABEL[event.color]} gets extra turn`;
    case 'skip': return `${COLOR_LABEL[event.color]} has no moves, skipped`;
    case 'forfeit': return `${COLOR_LABEL[event.color]} forfeited (3 sixes)`;
    case 'connected': return `${event.username} connected`;
    case 'disconnected': return `${event.username} disconnected`;
    default: return JSON.stringify(event);
  }
};

export default function GameEventLog() {
  const { recentEvents } = useGameStore();

  return (
    <div className="game-card p-4 flex-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Game Log</p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {recentEvents.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">Events will appear here...</p>
          ) : (
            recentEvents.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-slate-400 py-1 border-b border-white/5 last:border-0"
              >
                {eventLabel(e)}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
