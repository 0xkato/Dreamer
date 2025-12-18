import { useState } from 'react';
import { useProjectStore, useEditorStore, useCanvasStore, useElementsStore } from '../store';
import { ProjectSelector } from './ProjectSelector';

interface AppToolbarProps {
  onSave: () => void;
}

export function AppToolbar({ onSave }: AppToolbarProps) {
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'create' | 'open'>('open');

  const { currentProject } = useProjectStore();
  const { activeFilePath, openFiles, closeFile } = useEditorStore();
  const { viewport, resetViewport, toggleGrid, showGrid } = useCanvasStore();
  const { undo, redo, historyIndex, history } = useElementsStore();

  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;
  const isCanvas = activeFile?.type === 'canvas';

  const handleSwitchProject = () => {
    setSelectorMode('open');
    setShowProjectSelector(true);
  };

  const handleCloseFile = () => {
    if (activeFilePath) {
      if (activeFile?.isDirty) {
        if (!confirm('This file has unsaved changes. Close anyway?')) {
          return;
        }
      }
      closeFile(activeFilePath);
    }
  };

  return (
    <div className="h-12 bg-white border-b border-slate-200/80 flex items-center px-4 gap-1 shadow-sm">
      {/* Logo and project name */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-800 text-sm">Dreamer</span>
          {currentProject && (
            <>
              <span className="text-slate-400 text-sm">/</span>
              <span className="text-sm text-slate-600 max-w-32 truncate">
                {currentProject.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Project operations */}
      <button onClick={handleSwitchProject} className="btn btn-ghost text-xs">
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Switch
      </button>

      <div className="divider" />

      {/* File operations */}
      <button
        onClick={onSave}
        disabled={!activeFile?.isDirty}
        className="btn btn-ghost text-xs disabled:opacity-40"
        title="Save (Cmd+S)"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save
      </button>

      {activeFile && (
        <button onClick={handleCloseFile} className="btn btn-ghost text-xs">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      )}

      {/* Canvas-specific controls */}
      {isCanvas && (
        <>
          <div className="divider" />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Cmd+Z)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Cmd+Y)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="divider" />

          {/* View options */}
          <button
            onClick={toggleGrid}
            className={`btn btn-ghost ${showGrid ? 'active' : ''}`}
            title="Toggle Grid"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 9h16M4 13h16M4 17h16M9 4v16M13 4v16M17 4v16" />
            </svg>
            Grid
          </button>
          <button
            onClick={resetViewport}
            className="btn btn-ghost"
            title="Reset View"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
            Reset
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active file indicator */}
      {activeFile && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg mr-2">
          {activeFile.type === 'canvas' ? (
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <span className="text-xs font-medium text-slate-600 truncate max-w-40">
            {activeFile.name}
          </span>
          {activeFile.isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
        </div>
      )}

      {/* Zoom display (canvas only) */}
      {isCanvas && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <span className="text-xs font-medium text-slate-600">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </div>
      )}

      {/* Project selector dialog */}
      <ProjectSelector
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        mode={selectorMode}
      />
    </div>
  );
}
