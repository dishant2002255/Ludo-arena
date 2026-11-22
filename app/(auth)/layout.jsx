'use client';
import Link from 'next/link';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg,#fdf6e3 0%,#f5e9c8 100%)' }}>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg"
          style={{ background: 'linear-gradient(135deg,#f5c842,#c9960a)', color: '#3b2800', boxShadow: '0 3px 10px rgba(201,150,10,0.3)' }}>
          LA
        </div>
        <div>
          <span className="text-2xl font-black tracking-wide" style={{ color: '#3b2800' }}>
            LUDO <span style={{ color: '#c9960a' }}>ARENA</span>
          </span>
          <p className="text-xs" style={{ color: '#a09070' }}>1 Coin = ₹1 · Real Money</p>
        </div>
      </Link>

      {children}

      <p className="text-xs mt-8 text-center" style={{ color: '#c0a070' }}>
        18+ · Skill-based gaming · Play responsibly
      </p>
    </div>
  );
}
