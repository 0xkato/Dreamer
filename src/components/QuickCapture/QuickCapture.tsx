import { useState, useRef, useEffect } from 'react';

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (text: string) => void;
}

export function QuickCapture({ isOpen, onClose, onCapture }: QuickCaptureProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      // Small delay to ensure DOM is ready before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      e.preventDefault();
      onCapture(text.trim());
      setText('');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-[200]"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-auto mt-[20vh] p-4">
        <label className="block text-xs text-slate-400 dark:text-slate-500 mb-2">
          Quick Capture
        </label>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a quick thought..."
          className="w-full text-lg bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none py-2 text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600"
        />
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Enter to save to inbox.md, Escape to cancel
        </p>
      </div>
    </div>
  );
}
