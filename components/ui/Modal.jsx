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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div
        className={`w-full ${SIZE[size] || SIZE.md} rounded-t-3xl sm:rounded-3xl overflow-hidden`}
        style={{ background: '#fffdf5', border: '1.5px solid #e8d49a', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1.5px solid #e8d49a' }}>
            <h2 className="font-black text-base" style={{ color: '#3b2800' }}>{title}</h2>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: '#f0e6c8', color: '#c9960a' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
