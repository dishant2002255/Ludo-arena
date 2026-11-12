import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-black gradient-text font-display mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 mb-8">This page doesn't exist or was moved.</p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
