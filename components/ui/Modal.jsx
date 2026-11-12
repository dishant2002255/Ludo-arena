'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Allow clicking the scroll area outside the modal to close
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal — scrollable, never taller than viewport */}
          <motion.div
            className={`relative w-full ${sizeMap[size]} game-card my-auto ${className}`}
            style={{ marginTop: '1rem', marginBottom: '1rem' }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky title header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-navy-900 rounded-t-2xl z-10">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable content */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
