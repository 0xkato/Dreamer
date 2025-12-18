import { useState, useEffect, useRef } from 'react';
import { useCanvasStore, useElementsStore } from '../store';
import type { DiagramFile } from '../types';
import { exportDiagram } from '../utils/storage';
import { OpenDialog } from './OpenDialog';
import { SaveDialog } from './SaveDialog';

export function Toolbar() {
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const hasCheckedFirstUse = useRef(false);

  const { viewport, resetViewport, toggleGrid, showGrid } = useCanvasStore();
  const {
    elements,
    connectors,
    undo,
    redo,
    historyIndex,
    history,
    currentDiagramName,
  } = useElementsStore();

  // Show create dialog on first use (no diagram exists)
  useEffect(() => {
    if (hasCheckedFirstUse.current) return;

    // Small delay to let initialization complete
    const timer = setTimeout(() => {
      hasCheckedFirstUse.current = true;
      const { currentDiagramId } = useElementsStore.getState();
      if (!currentDiagramId) {
        setIsCreateDialogOpen(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
  };

  const handleOpen = () => {
    setIsOpenDialogOpen(true);
  };

  const handleExport = () => {
    const diagram: DiagramFile = {
      version: '1.0.0',
      metadata: {
        name: 'diagram',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      viewport,
      elements,
      connectors,
    };

    exportDiagram(diagram, 'diagram');
  };

  return (
    <div className="h-14 bg-white border-b border-slate-200/80 flex items-center px-4 gap-1 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-800 text-sm">Dreamer</span>
          {currentDiagramName && (
            <>
              <span className="text-slate-400 text-sm">/</span>
              <span className="text-sm text-slate-600 max-w-32 truncate">
                {currentDiagramName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* File operations */}
      <button onClick={handleCreate} className="btn btn-ghost">
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New
      </button>
      <button onClick={handleOpen} className="btn btn-ghost">
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Open
      </button>
      <button onClick={handleExport} className="btn btn-ghost">
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      <div className="divider" />

      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={historyIndex <= 0}
        className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={historyIndex >= history.length - 1}
        className="btn btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        <span className="text-xs font-medium text-slate-600">
          {Math.round(viewport.zoom * 100)}%
        </span>
      </div>

      {/* Dialogs */}
      <OpenDialog
        isOpen={isOpenDialogOpen}
        onClose={() => setIsOpenDialogOpen(false)}
        onNeedCreate={() => {
          setIsOpenDialogOpen(false);
          setIsCreateDialogOpen(true);
        }}
      />
      <SaveDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        isNewWhiteboard={true}
      />
    </div>
  );
}
