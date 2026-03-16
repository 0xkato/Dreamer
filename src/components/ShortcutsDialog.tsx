import { useEffect } from 'react';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

const sections: ShortcutSection[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: 'Cmd+S', description: 'Save file' },
      { keys: 'Shift+Tab', description: 'Quick Lookup' },
      { keys: 'Cmd+Shift+F', description: 'Search files' },
      { keys: 'Cmd+Shift+N', description: 'Quick Capture' },
      { keys: 'Cmd+Shift+Enter', description: 'Focus mode' },
      { keys: 'Cmd+/', description: 'This dialog' },
    ],
  },
  {
    title: 'Markdown Editor',
    shortcuts: [
      { keys: '/', description: 'Slash command menu' },
      { keys: 'Cmd+B', description: 'Bold' },
      { keys: 'Cmd+I', description: 'Italic' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: 'V', description: 'Select tool' },
      { keys: 'R', description: 'Rectangle' },
      { keys: 'O', description: 'Ellipse' },
      { keys: 'T', description: 'Text' },
      { keys: 'L', description: 'Connector' },
      { keys: 'P', description: 'Pen (freehand)' },
      { keys: 'Delete', description: 'Delete selected' },
      { keys: 'Cmd+Z', description: 'Undo' },
      { keys: 'Cmd+Shift+Z', description: 'Redo' },
      { keys: 'Cmd+C / Cmd+V / Cmd+X', description: 'Copy / Paste / Cut' },
    ],
  },
  {
    title: 'Calendar',
    shortcuts: [
      { keys: '\u2190 \u2192', description: 'Navigate weeks' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
      {children}
    </kbd>
  );
}

function SectionBlock({ section }: { section: ShortcutSection }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">
        {section.title}
      </h3>
      <div className="space-y-2">
        {section.shortcuts.map((shortcut) => (
          <div key={shortcut.keys} className="flex items-center justify-between gap-4">
            <Kbd>{shortcut.keys}</Kbd>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {shortcut.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(80vh-64px)]">
          <div className="grid grid-cols-2 gap-8">
            {sections.map((section) => (
              <SectionBlock key={section.title} section={section} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
