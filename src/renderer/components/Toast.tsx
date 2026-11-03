import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

// A small ink pill that rises at the bottom of the window and goes again
export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 1600 }) => {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[118px] z-50 flex justify-center" role="status">
      <div className="flex items-center gap-2 rounded-full bg-ink/90 py-2 pl-3 pr-4 text-xs font-medium text-paper shadow-pill backdrop-blur-xl animate-sheet">
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        {message}
      </div>
    </div>
  );
};
