import { useEffect, useState } from 'react';
import { useProjectStore, useFileTreeStore, useEditorStore } from '../../store';
import { FileTreeNode } from './FileTreeNode';
import { FileTreeContextMenu, type ContextMenuState } from './FileTreeContextMenu';
import { NewFileDialog } from './NewFileDialog';

export function FileTree() {
  const { currentProject } = useProjectStore();
  const { nodes, isLoading, error, refreshTree, expandedPaths, selectedPath, setSelectedPath, renameNode } = useFileTreeStore();
  const { openFile, activeFilePath, openFiles, saveFile } = useEditorStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [newFileDialog, setNewFileDialog] = useState<{
    isOpen: boolean;
    type: 'markdown' | 'canvas' | 'folder';
    parentPath: string;
  } | null>(null);

  // Unsaved changes dialog state
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    pendingPath: string;
    pendingType: 'markdown' | 'canvas';
    currentFileName: string;
  } | null>(null);

  // Rename dialog state
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    nodePath: string;
    absolutePath: string;
    currentName: string;
    newName: string;
  } | null>(null);

  // Load file tree when project changes
  useEffect(() => {
    if (currentProject) {
      refreshTree(currentProject.path);
    }
  }, [currentProject, refreshTree]);

  const handleContextMenu = (e: React.MouseEvent, nodePath: string | null, nodeType: 'folder' | 'markdown' | 'canvas' | 'root') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodePath,
      nodeType,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleNewFile = (type: 'markdown' | 'canvas' | 'folder', parentPath: string) => {
    setNewFileDialog({ isOpen: true, type, parentPath });
    handleCloseContextMenu();
  };

  const handleFileDoubleClick = async (path: string, type: 'markdown' | 'canvas') => {
    if (!currentProject) return;

    // Check if there's a current file with unsaved markdown changes
    if (activeFilePath && activeFilePath !== path) {
      const currentFile = openFiles.get(activeFilePath);
      // Only prompt for markdown files - canvas auto-saves
      if (currentFile?.type === 'markdown' && currentFile.isDirty) {
        setUnsavedDialog({
          isOpen: true,
          pendingPath: path,
          pendingType: type,
          currentFileName: currentFile.name,
        });
        return;
      }
    }

    await openFile(currentProject.path, path, type);
  };

  // Handle unsaved dialog actions
  const handleSaveAndSwitch = async () => {
    if (!currentProject || !unsavedDialog || !activeFilePath) return;
    await saveFile(currentProject.path, activeFilePath);
    await openFile(currentProject.path, unsavedDialog.pendingPath, unsavedDialog.pendingType);
    setUnsavedDialog(null);
  };

  const handleDiscardAndSwitch = async () => {
    if (!currentProject || !unsavedDialog) return;
    // Just open the new file without saving (discarding changes)
    await openFile(currentProject.path, unsavedDialog.pendingPath, unsavedDialog.pendingType);
    setUnsavedDialog(null);
  };

  const handleCancelSwitch = () => {
    setUnsavedDialog(null);
  };

  // Rename handlers
  const handleRename = (nodePath: string, absolutePath: string, currentName: string) => {
    setRenameDialog({
      isOpen: true,
      nodePath,
      absolutePath,
      currentName,
      newName: currentName,
    });
  };

  const handleRenameSubmit = async () => {
    if (!currentProject || !renameDialog || !renameDialog.newName.trim()) return;
    if (renameDialog.newName === renameDialog.currentName) {
      setRenameDialog(null);
      return;
    }
    try {
      await renameNode(currentProject.path, renameDialog.absolutePath, renameDialog.newName.trim());
      setRenameDialog(null);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleFileSelect = (path: string) => {
    setSelectedPath(path);
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div
      className="h-full flex flex-col bg-slate-50 border-r border-slate-200"
      onContextMenu={(e) => handleContextMenu(e, null, 'root')}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-slate-700 truncate">
            {currentProject.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNewFile('markdown', '')}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="New Markdown File"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleNewFile('folder', '')}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="New Folder"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={() => refreshTree(currentProject.path)}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200">
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}

      {/* File tree content - root level drop target */}
      <div
        className="flex-1 overflow-auto py-1"
        data-drop-target="true"
        data-node-path=""
        data-node-abspath={currentProject.path}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : nodes.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-slate-400 mb-3">No files yet</p>
            <button
              onClick={() => handleNewFile('markdown', '')}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className="px-1">
            {nodes.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedPaths={expandedPaths}
                selectedPath={selectedPath}
                activeFilePath={activeFilePath}
                onSelect={handleFileSelect}
                onDoubleClick={handleFileDoubleClick}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <FileTreeContextMenu
          state={contextMenu}
          onClose={handleCloseContextMenu}
          onNewFile={handleNewFile}
          onRename={handleRename}
          projectPath={currentProject.path}
        />
      )}

      {/* New file dialog */}
      {newFileDialog?.isOpen && (
        <NewFileDialog
          type={newFileDialog.type}
          parentPath={newFileDialog.parentPath}
          onClose={() => setNewFileDialog(null)}
          projectPath={currentProject.path}
        />
      )}

      {/* Unsaved changes dialog */}
      {unsavedDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Unsaved Changes</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                You have unsaved changes in <span className="font-medium">{unsavedDialog.currentFileName}</span>.
                Do you want to save before switching?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelSwitch}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscardAndSwitch}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAndSwitch}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename dialog */}
      {renameDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Rename</h2>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={renameDialog.newName}
                onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setRenameDialog(null);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRenameDialog(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameSubmit}
                  disabled={!renameDialog.newName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
