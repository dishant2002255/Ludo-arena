'use client';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gaming-gradient flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Gamepad2 size={20} className="text-white" />
        </div>
        <span className="text-2xl font-bold gradient-text font-display">Ludo Arena</span>
      </Link>
      {children}
    </div>
  );
}
