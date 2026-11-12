'use client';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, onClick, padding = 'p-6' }) {
  const base = `game-card ${padding} ${className}`;
  if (hover || onClick) {
    return (
      <motion.div
        className={`${base} game-card-hover cursor-pointer`}
        onClick={onClick}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    );
  }
  return <div className={base}>{children}</div>;
}

export function StatCard({ title, value, icon, change, color = 'purple', className = '' }) {
  const colorMap = {
    purple: 'text-purple-400 bg-purple-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    red: 'text-red-400 bg-red-500/10',
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white font-display">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.purple}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
