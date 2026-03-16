import React from 'react';
import type { OpenFile } from '../types/project';

interface TabBarProps {
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  splitFilePath?: string | null;
  isSplitView?: boolean;
  focusedPane?: 'left' | 'right';
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onToggleFocusedPane?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFilePath,
  splitFilePath,
  isSplitView = false,
  focusedPane = 'left',
  onSelectTab,
  onCloseTab,
  onToggleFocusedPane,
}) => {
  const tabs = Array.from(openFiles.entries());

  return (
    <div className="flex items-center overflow-x-auto">
      {tabs.map(([path, file]) => {
        const isActive = path === activeFilePath;
        const isInLeftPane = isSplitView && path === activeFilePath;
        const isInRightPane = isSplitView && path === splitFilePath;

        // In split view, determine highlight: the tab is "selected" if it matches the focused pane's file
        const isHighlighted = isSplitView
          ? (focusedPane === 'left' && path === activeFilePath) ||
            (focusedPane === 'right' && path === splitFilePath)
          : isActive;

        return (
          <button
            key={path}
            onClick={() => onSelectTab(path)}
            className={`group flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isHighlighted
                ? 'bg-white dark:bg-slate-800 border-indigo-500 text-slate-800 dark:text-slate-200'
                : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {/* Pane indicators (colored dots) in split view */}
            {isSplitView && (isInLeftPane || isInRightPane) && (
              <span className="flex items-center gap-0.5 flex-shrink-0">
                {isInLeftPane && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      focusedPane === 'left'
                        ? 'bg-indigo-500'
                        : 'bg-indigo-300 dark:bg-indigo-700'
                    }`}
                    title="Left pane"
                  />
                )}
                {isInRightPane && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      focusedPane === 'right'
                        ? 'bg-emerald-500'
                        : 'bg-emerald-300 dark:bg-emerald-700'
                    }`}
                    title="Right pane"
                  />
                )}
              </span>
            )}

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

      {/* Focus indicator in split view */}
      {isSplitView && (
        <button
          onClick={onToggleFocusedPane}
          className="flex items-center gap-1.5 ml-2 px-2 py-1 text-xs font-medium rounded transition-colors text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 flex-shrink-0"
          title="Click to toggle focused pane"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              focusedPane === 'left'
                ? 'bg-indigo-500'
                : 'bg-emerald-500'
            }`}
          />
          <span>
            Focus: {focusedPane === 'left' ? 'Left' : 'Right'}
          </span>
        </button>
      )}
    </div>
  );
};
