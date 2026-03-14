import { useState, useEffect } from 'react';
import { getBacklinks } from '../../services/fileSystem';
import type { BacklinkResult } from '../../services/fileSystem';

interface BacklinksPanelProps {
  projectPath: string;
  currentFile: string;
  onOpenFile: (path: string) => void;
}

export function BacklinksPanel({ projectPath, currentFile, onOpenFile }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectPath || !currentFile) return;

    let cancelled = false;
    setIsLoading(true);

    getBacklinks(projectPath, currentFile).then((results) => {
      if (!cancelled) {
        setBacklinks(results);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setBacklinks([]);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectPath, currentFile]);

  if (isLoading && backlinks.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Backlinks ({backlinks.length})
      </button>

      {!isCollapsed && backlinks.length > 0 && (
        <div className="px-3 pb-2 space-y-0.5">
          {backlinks.map((bl) => (
            <button
              key={bl.file}
              onClick={() => onOpenFile(bl.file)}
              className="flex items-center gap-2 w-full px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-left"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{bl.file}</span>
            </button>
          ))}
        </div>
      )}

      {!isCollapsed && backlinks.length === 0 && !isLoading && (
        <div className="px-3 pb-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No backlinks found</p>
        </div>
      )}
    </div>
  );
}
