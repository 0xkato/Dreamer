import { useEffect, useRef, useCallback, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { ToolsSidebar } from './components/ToolsSidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { FileTree } from './components/FileTree';
import { SearchPanel } from './components/SearchPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MarkdownEditor } from './components/MarkdownEditor';
import { AppToolbar } from './components/AppToolbar';
import { TabBar } from './components/TabBar';
import { CalendarView } from './components/Calendar';
import { QuickLookup } from './components/QuickLookup';
import { QuickCapture } from './components/QuickCapture';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { readMarkdownFile, writeMarkdownFile } from './services/fileSystem';
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

  // Quick capture state (Cmd+Shift+N)
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Focus/Zen mode
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Split view state
  const [isSplitView, setIsSplitView] = useState(false);
  const [splitFilePath, setSplitFilePath] = useState<string | null>(null);
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left');

  // Global search state (Cmd+Shift+F)
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Shortcuts help dialog state (Cmd+/)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Project state
  const { currentProject, initialize: initializeProject } = useProjectStore();

  // Editor state
  const {
    activeFilePath,
    openFiles,
    openFile,
    setActiveFile,
    closeFile,
    updateMarkdownContent,
    updateCanvasContent,
    saveActiveFile,
    saveFile,
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

  // Get split pane file
  const splitFile = splitFilePath ? openFiles.get(splitFilePath) : null;

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

  // Handle content changes for markdown (with auto-save)
  const markdownAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMarkdownChange = useCallback((text: string) => {
    if (!activeFile || activeFile.type !== 'markdown' || !currentProject) return;
    updateMarkdownContent(activeFile.path, text);

    // Debounced auto-save
    if (markdownAutoSaveRef.current) {
      clearTimeout(markdownAutoSaveRef.current);
    }
    markdownAutoSaveRef.current = setTimeout(async () => {
      await saveActiveFile(currentProject.path);
    }, AUTO_SAVE_DELAY);
  }, [activeFile, currentProject, updateMarkdownContent, saveActiveFile]);

  // Handle content changes for split pane markdown (with auto-save)
  const splitAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSplitMarkdownChange = useCallback((text: string) => {
    if (!splitFilePath || !currentProject) return;
    const file = openFiles.get(splitFilePath);
    if (!file || file.type !== 'markdown') return;
    updateMarkdownContent(splitFilePath, text);

    // Debounced auto-save
    if (splitAutoSaveRef.current) {
      clearTimeout(splitAutoSaveRef.current);
    }
    splitAutoSaveRef.current = setTimeout(async () => {
      await saveFile(currentProject.path, splitFilePath);
    }, AUTO_SAVE_DELAY);
  }, [splitFilePath, currentProject, openFiles, updateMarkdownContent, saveFile]);

  // Handle wiki-link click: resolve link name to a file and open it
  const handleOpenLink = useCallback((name: string) => {
    if (!currentProject) return;
    const isCanvas = name.endsWith('.canvas');
    const fileName = isCanvas ? name : (name.endsWith('.md') ? name : `${name}.md`);
    openFile(currentProject.path, fileName, isCanvas ? 'canvas' : 'markdown');
  }, [currentProject, openFile]);

  // Cleanup markdown auto-save timers
  useEffect(() => {
    return () => {
      if (markdownAutoSaveRef.current) {
        clearTimeout(markdownAutoSaveRef.current);
      }
      if (splitAutoSaveRef.current) {
        clearTimeout(splitAutoSaveRef.current);
      }
    };
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    // If it's a canvas, sync first
    if (activeFile?.type === 'canvas') {
      syncCanvasToEditor();
    }

    await saveActiveFile(currentProject.path);
  }, [currentProject, activeFile, syncCanvasToEditor, saveActiveFile]);

  // Quick capture handler
  const handleQuickCapture = useCallback(async (text: string) => {
    if (!currentProject) return;
    try {
      const inboxPath = currentProject.path + '/inbox.md';
      let existing = '';
      try {
        existing = await readMarkdownFile(inboxPath);
      } catch {
        // File doesn't exist yet, start fresh
      }
      const timestamp = new Date().toLocaleString();
      const newContent = existing + (existing ? '\n' : '') + `- ${text} _(${timestamp})_\n`;
      await writeMarkdownFile(inboxPath, newContent);
    } catch (error) {
      console.error('Failed to save quick capture:', error);
    }
    setIsQuickCaptureOpen(false);
  }, [currentProject]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Focus/Zen mode toggle (Cmd+Shift+Enter)
      if (isMod && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
        return;
      }

      // Global search (Cmd+Shift+F)
      if (isMod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Quick capture (Cmd+Shift+N)
      if (isMod && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
        return;
      }

      // Quick lookup (Shift+Tab) - always works, even in inputs
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        setIsQuickLookupOpen(true);
        return;
      }

      // Help dialog (Cmd+/)
      if (isMod && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(true);
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

  // Focus mode: just the editor, nothing else
  if (isFocusMode && activeFile?.type === 'markdown') {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
        {/* Minimal top bar with exit button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-700">
          <span className="text-sm text-slate-400 dark:text-slate-500">{activeFile.name}</span>
          <button
            onClick={() => setIsFocusMode(false)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Focus
          </button>
        </div>
        <div className="flex-1 max-w-3xl mx-auto w-full">
          <MarkdownEditor
            key={activeFile.path}
            file={activeFile}
            onContentChange={handleMarkdownChange}
            onSave={handleSave}
            onOpenLink={handleOpenLink}
          />
        </div>

        <QuickLookup
          isOpen={isQuickLookupOpen}
          onClose={() => setIsQuickLookupOpen(false)}
        />

        <QuickCapture
          isOpen={isQuickCaptureOpen}
          onClose={() => setIsQuickCaptureOpen(false)}
          onCapture={handleQuickCapture}
        />

        <ShortcutsDialog isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-slate-900">
      {/* Top toolbar */}
      <div className="relative z-50">
        <AppToolbar onSave={handleSave} />
      </div>

      {/* View toggle tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setCurrentView('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'notes'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
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
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
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
        <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tab bar - only in notes view when files are open */}
        {openFiles.size > 0 && (
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1 overflow-x-auto">
              <TabBar
                openFiles={openFiles}
                activeFilePath={activeFilePath}
                splitFilePath={splitFilePath}
                isSplitView={isSplitView}
                focusedPane={focusedPane}
                onSelectTab={(path) => {
                  if (isSplitView && focusedPane === 'right') {
                    setSplitFilePath(path);
                  } else {
                    setActiveFile(path);
                  }
                }}
                onCloseTab={(path) => {
                  // If closing the split file, exit split view
                  if (path === splitFilePath) {
                    setIsSplitView(false);
                    setSplitFilePath(null);
                    setFocusedPane('left');
                  }
                  closeFile(path);
                }}
                onToggleFocusedPane={() => setFocusedPane(prev => prev === 'left' ? 'right' : 'left')}
              />
            </div>
            {/* Split view toggle button */}
            <button
              onClick={() => {
                if (isSplitView) {
                  setIsSplitView(false);
                  setSplitFilePath(null);
                  setFocusedPane('left');
                } else {
                  setIsSplitView(true);
                  setFocusedPane('right');
                  const otherFile = Array.from(openFiles.keys()).find(p => p !== activeFilePath);
                  setSplitFilePath(otherFile || activeFilePath);
                }
              }}
              className={`flex-shrink-0 p-1.5 mx-1 rounded transition-colors ${
                isSplitView
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={isSplitView ? 'Close split view' : 'Split view'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
        )}
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
              {isSearchOpen ? (
                <SearchPanel
                  onClose={() => setIsSearchOpen(false)}
                  onOpenFile={(filePath) => {
                    openFile(currentProject.path, filePath, filePath.endsWith('.canvas') ? 'canvas' : 'markdown');
                    setIsSearchOpen(false);
                  }}
                />
              ) : (
                <FileTree />
              )}
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-md shadow-sm p-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            style={{ left: isCollapsed ? 0 : sidebarWidth }}
            title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <svg
              className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left pane (always shown) */}
            <div
              className={`flex-1 flex flex-col overflow-hidden ${
                isSplitView
                  ? focusedPane === 'left'
                    ? 'ring-2 ring-inset ring-indigo-500'
                    : 'opacity-[0.97]'
                  : ''
              }`}
              onClick={() => isSplitView && setFocusedPane('left')}
            >
            {/* Left pane top bar in split view */}
            {isSplitView && (
              <div className={`flex items-center justify-between px-3 flex-shrink-0 ${
                focusedPane === 'left'
                  ? 'h-1.5 bg-indigo-500'
                  : 'h-1 bg-indigo-200 dark:bg-indigo-900'
              }`}>
              </div>
            )}
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
                    onOpenLink={handleOpenLink}
                  />
                </div>
              )
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-1">No file selected</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Select a file from the sidebar or create a new one
                  </p>
                </div>
              </div>
            )}
            </div>
            </div>

            {/* Right pane (only in split view) */}
            {isSplitView && (
              <>
                <div className="w-px bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                <div
                  className={`flex-1 flex flex-col overflow-hidden ${
                    focusedPane === 'right'
                      ? 'ring-2 ring-inset ring-emerald-500'
                      : 'opacity-[0.97]'
                  }`}
                  onClick={() => setFocusedPane('right')}
                >
                  {/* Right pane top bar */}
                  <div className={`flex-shrink-0 ${
                    focusedPane === 'right'
                      ? 'h-1.5 bg-emerald-500'
                      : 'h-1 bg-emerald-200 dark:bg-emerald-900'
                  }`} />
                  <div className="flex-1 flex overflow-hidden">
                  {splitFile ? (
                    splitFile.type === 'canvas' ? (
                      /* Canvas in split pane - show read-only notice */
                      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        <div className="text-center">
                          <p className="text-sm text-slate-400 dark:text-slate-500">
                            Canvas files cannot be shown in split view
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Markdown editor for split pane */
                      <div className="flex-1">
                        <MarkdownEditor
                          key={`split-${splitFile.path}`}
                          file={splitFile}
                          onContentChange={handleSplitMarkdownChange}
                          onSave={handleSave}
                          onOpenLink={handleOpenLink}
                        />
                      </div>
                    )
                  ) : (
                    /* Empty state for split pane */
                    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Click a tab to open a file here
                        </p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Quick lookup modal */}
      <QuickLookup
        isOpen={isQuickLookupOpen}
        onClose={() => setIsQuickLookupOpen(false)}
      />

      {/* Quick capture modal */}
      <QuickCapture
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onCapture={handleQuickCapture}
      />

      {/* Shortcuts help dialog */}
      <ShortcutsDialog isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}

export default App;
