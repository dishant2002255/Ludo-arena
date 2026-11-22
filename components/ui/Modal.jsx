'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZE = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-2xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${SIZE[size] || SIZE.md} flex flex-col`}
        style={{
          background: '#fffdf5',
          border: '1.5px solid #e8d49a',
          borderRadius: '24px 24px 0 0',
          /* 85% of viewport height so bottom nav stays visible */
          maxHeight: '85dvh',
          height: 'auto',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: '#e8d49a' }} />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: '1.5px solid #f0e6c8' }}>
            <h2 className="font-black text-base" style={{ color: '#3b2800' }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#f0e6c8', color: '#c9960a' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Scrollable body — pb-8 ensures last item clears bottom edge */}
        <div className="overflow-y-auto flex-1 overscroll-contain pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
