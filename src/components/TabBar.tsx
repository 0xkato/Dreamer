import React from 'react';
import type { OpenFile } from '../types/project';

interface TabBarProps {
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
}) => {
  const tabs = Array.from(openFiles.entries());

  return (
    <div className="flex items-center overflow-x-auto">
      {tabs.map(([path, file]) => {
        const isActive = path === activeFilePath;

        return (
          <button
            key={path}
            onClick={() => onSelectTab(path)}
            className={`group flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'bg-white dark:bg-slate-800 border-indigo-500 text-slate-800 dark:text-slate-200'
                : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {/* File icon */}
            {file.type === 'canvas' ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}

            {/* File name */}
            <span>{file.name}</span>

            {/* Dirty indicator */}
            {file.isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            )}

            {/* Close button */}
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(path);
              }}
              className={`ml-1 p-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0 transition-opacity ${
                file.isDirty ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
};
