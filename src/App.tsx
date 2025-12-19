import { useEffect, useRef, useCallback, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { ToolsSidebar } from './components/ToolsSidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { FileTree } from './components/FileTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MarkdownEditor } from './components/MarkdownEditor';
import { AppToolbar } from './components/AppToolbar';
import { CalendarView } from './components/Calendar';
import { QuickLookup } from './components/QuickLookup';
import {
  useElementsStore,
  useCanvasStore,
  useProjectStore,
  useEditorStore,
} from './store';
import type { CanvasContent } from './types/project';

type AppView = 'notes' | 'calendar';

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 256;
const AUTO_SAVE_DELAY = 2000; // Auto-save 2 seconds after last change

function App() {
  const hasInitialized = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string>('');

  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // App view state (notes vs calendar)
  const [currentView, setCurrentView] = useState<AppView>('notes');

  // Quick lookup state (Cmd+P)
  const [isQuickLookupOpen, setIsQuickLookupOpen] = useState(false);

  // Project state
  const { currentProject, initialize: initializeProject } = useProjectStore();

  // Editor state
  const {
    activeFilePath,
    openFiles,
    updateMarkdownContent,
    updateCanvasContent,
    saveActiveFile,
  } = useEditorStore();

  // Canvas/elements state (for keyboard shortcuts when in canvas mode)
  const {
    undo,
    redo,
    copy,
    paste,
    cut,
    deleteSelected,
    loadDiagram: loadDiagramToCanvas,
  } = useElementsStore();

  const { setViewport } = useCanvasStore();

  // Get active file
  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

  // Initialize project store on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    initializeProject();
  }, [initializeProject]);

  // Load canvas content into elements store when opening a canvas file
  useEffect(() => {
    if (!activeFile || activeFile.type !== 'canvas') return;

    const content = activeFile.content as CanvasContent;
    loadDiagramToCanvas(content.elements, content.connectors);
    setViewport(content.viewport);

    // Reset the sync ref when loading a new file
    lastSyncedRef.current = JSON.stringify({ elements: content.elements, connectors: content.connectors });
  }, [activeFilePath, activeFile?.type]);

  // Auto-save: Subscribe to elements store changes and auto-save canvas
  useEffect(() => {
    if (!activeFile || activeFile.type !== 'canvas' || !currentProject) return;

    const unsubscribe = useElementsStore.subscribe((state) => {
      // Create a snapshot of current state
      const currentState = JSON.stringify({
        elements: state.elements,
        connectors: state.connectors,
      });

      // Only trigger save if state actually changed
      if (currentState === lastSyncedRef.current) return;
      lastSyncedRef.current = currentState;

      // Sync to editor store immediately (marks as dirty)
      const { viewport } = useCanvasStore.getState();
      updateCanvasContent(activeFile.path, {
        elements: state.elements,
        connectors: state.connectors,
        viewport,
      });

      // Debounced auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(async () => {
        await saveActiveFile(currentProject.path);
      }, AUTO_SAVE_DELAY);
    });

    return () => {
      unsubscribe();
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeFile, currentProject, updateCanvasContent, saveActiveFile]);

  // Sync canvas changes back to editor store
  const syncCanvasToEditor = useCallback(() => {
    if (!activeFile || activeFile.type !== 'canvas' || !currentProject) return;

    const { elements, connectors } = useElementsStore.getState();
    const { viewport } = useCanvasStore.getState();

    updateCanvasContent(activeFile.path, {
      elements,
      connectors,
      viewport,
    });
  }, [activeFile, currentProject, updateCanvasContent]);

  // Handle content changes for markdown
  const handleMarkdownChange = useCallback((text: string) => {
    if (!activeFile || activeFile.type !== 'markdown') return;
    updateMarkdownContent(activeFile.path, text);
  }, [activeFile, updateMarkdownContent]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    // If it's a canvas, sync first
    if (activeFile?.type === 'canvas') {
      syncCanvasToEditor();
    }

    await saveActiveFile(currentProject.path);
  }, [currentProject, activeFile, syncCanvasToEditor, saveActiveFile]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Quick lookup (Shift+Tab) - always works, even in inputs
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        setIsQuickLookupOpen(true);
        return;
      }

      // Ignore if typing in an input (but not CodeMirror)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow Cmd+S in inputs for saving
        if (isMod && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        return;
      }

      // Save
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Canvas-specific shortcuts (only when viewing canvas)
      if (activeFile?.type === 'canvas') {
        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelected();
          syncCanvasToEditor();
          return;
        }

        // Undo
        if (isMod && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          syncCanvasToEditor();
          return;
        }

        // Redo
        if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault();
          redo();
          syncCanvasToEditor();
          return;
        }

        // Copy
        if (isMod && e.key === 'c') {
          e.preventDefault();
          copy();
          return;
        }

        // Paste
        if (isMod && e.key === 'v') {
          e.preventDefault();
          paste();
          syncCanvasToEditor();
          return;
        }

        // Cut
        if (isMod && e.key === 'x') {
          e.preventDefault();
          cut();
          syncCanvasToEditor();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, handleSave, undo, redo, copy, paste, cut, deleteSelected, syncCanvasToEditor]);

  // Sidebar resize handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Show welcome screen if no project is open
  if (!currentProject) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top toolbar */}
      <div className="relative z-50">
        <AppToolbar onSave={handleSave} />
      </div>

      {/* View toggle tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200">
        <button
          onClick={() => setCurrentView('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'notes'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Notes
        </button>
        <button
          onClick={() => setCurrentView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'calendar'
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendar
        </button>
      </div>

      {/* Calendar View */}
      {currentView === 'calendar' ? (
        <div className="flex-1 overflow-hidden">
          <CalendarView />
        </div>
      ) : (
        /* Notes View */
        <div className="flex flex-1 overflow-hidden">
          {/* Left file tree - resizable and collapsible */}
          <div
            ref={sidebarRef}
            className="flex-shrink-0 relative z-40 flex"
            style={{ width: isCollapsed ? 0 : sidebarWidth }}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Sidebar content */}
            <div
              className={`flex-1 overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
              style={{ width: sidebarWidth }}
            >
              <FileTree />
            </div>

            {/* Resize handle */}
            {!isCollapsed && (
              <div
                className="w-1 hover:w-1 bg-transparent hover:bg-indigo-400 cursor-col-resize transition-colors flex-shrink-0"
                onMouseDown={startResizing}
              />
            )}
          </div>

          {/* Collapse toggle button */}
          <button
            onClick={toggleSidebar}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-slate-200 rounded-r-md shadow-sm p-1 hover:bg-slate-50 transition-all"
            style={{ left: isCollapsed ? 0 : sidebarWidth }}
            title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden">
            {activeFile ? (
              activeFile.type === 'canvas' ? (
                <>
                  {/* Canvas tools sidebar */}
                  <div className="relative z-40" onWheel={(e) => e.stopPropagation()}>
                    <ToolsSidebar />
                  </div>

                  {/* Canvas */}
                  <div className="flex-1 relative z-0">
                    <Canvas />
                  </div>

                  {/* Properties panel */}
                  <div className="relative z-40" onWheel={(e) => e.stopPropagation()}>
                    <PropertiesPanel />
                  </div>
                </>
              ) : (
                /* Markdown editor */
                <div className="flex-1">
                  <MarkdownEditor
                    key={activeFile.path}
                    file={activeFile}
                    onContentChange={handleMarkdownChange}
                    onSave={handleSave}
                  />
                </div>
              )
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 mb-1">No file selected</h3>
                  <p className="text-sm text-slate-400">
                    Select a file from the sidebar or create a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick lookup modal */}
      <QuickLookup
        isOpen={isQuickLookupOpen}
        onClose={() => setIsQuickLookupOpen(false)}
      />
    </div>
  );
}

export default App;
