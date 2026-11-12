'use client';

const colorMap = {
  red: 'from-red-500 to-rose-600',
  green: 'from-emerald-500 to-green-600',
  yellow: 'from-yellow-500 to-amber-600',
  blue: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-violet-600',
};

export default function Avatar({ username = '?', size = 'md', color = 'purple', src, className = '' }) {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const gradient = colorMap[color] || colorMap.purple;
  const initial = username?.charAt(0)?.toUpperCase() || '?';
  const sz = sizeMap[size] || sizeMap.md;

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className={`${sz} rounded-full object-cover ring-2 ring-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center 
                  font-bold text-white ring-2 ring-white/10 shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
