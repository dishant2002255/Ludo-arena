'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="text-center game-card p-10 max-w-md w-full">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">{error?.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="btn-primary px-6 py-3 rounded-xl text-white font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
