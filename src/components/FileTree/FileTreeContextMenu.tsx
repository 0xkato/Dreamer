import { useEffect, useRef, useState } from 'react';
import { useFileTreeStore } from '../../store';
import type { FileNode } from '../../types/project';
import { FOLDER_COLORS } from '../../types/project';

export interface ContextMenuState {
  x: number;
  y: number;
  nodePath: string | null;
  nodeType: 'folder' | 'markdown' | 'canvas' | 'root';
}

interface FileTreeContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onNewFile: (type: 'markdown' | 'canvas' | 'folder', parentPath: string) => void;
  onRename: (nodePath: string, absolutePath: string, currentName: string) => void;
  onSaveAsTemplate: (nodePath: string, absolutePath: string, fileName: string) => void;
  projectPath: string;
}

export function FileTreeContextMenu({ state, onClose, onNewFile, onRename, onSaveAsTemplate, projectPath }: FileTreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { deleteNode, nodes, setFolderColor, getFolderColor } = useFileTreeStore();
  const currentColor = state.nodePath && state.nodeType === 'folder' ? getFolderColor(state.nodePath) : null;

  // Find the node to get its absolute path
  const findNodeAbsolutePath = (path: string): string | null => {
    const findInNodes = (nodeList: FileNode[], targetPath: string): string | null => {
      for (const node of nodeList) {
        if (node.path === targetPath) return node.absolutePath;
        if (node.children) {
          const found = findInNodes(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };
    return findInNodes(nodes, path);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(state.x, window.innerWidth - 200);
  const adjustedY = Math.min(state.y, window.innerHeight - 300);

  // Determine parent path for new files
  const getParentPath = () => {
    if (state.nodeType === 'root' || !state.nodePath) return '';
    if (state.nodeType === 'folder') return state.nodePath;
    // For files, get parent directory
    const parts = state.nodePath.split('/');
    parts.pop();
    return parts.join('/');
  };

  const handleDelete = async () => {
    if (!state.nodePath) return;

    const absolutePath = findNodeAbsolutePath(state.nodePath);
    if (!absolutePath) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${state.nodePath.split('/').pop()}"?`
    );

    if (confirmDelete) {
      await deleteNode(projectPath, absolutePath);
    }
    onClose();
  };

  const parentPath = getParentPath();

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* New file options */}
      <button
        onClick={() => onNewFile('markdown', parentPath)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        New Markdown File
      </button>
      <button
        onClick={() => onNewFile('canvas', parentPath)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
        </svg>
        New Canvas
      </button>
      <button
        onClick={() => onNewFile('folder', parentPath)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        New Folder
      </button>

      {/* Separator and rename/delete options for files/folders */}
      {state.nodePath && state.nodeType !== 'root' && (
        <>
          <div className="my-1 border-t border-slate-200" />
          <button
            onClick={() => {
              const absolutePath = findNodeAbsolutePath(state.nodePath!);
              if (absolutePath) {
                const currentName = state.nodePath!.split('/').pop() || '';
                onRename(state.nodePath!, absolutePath, currentName);
              }
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>

          {/* Save as Template - only for markdown files */}
          {state.nodeType === 'markdown' && (
            <button
              onClick={() => {
                const absolutePath = findNodeAbsolutePath(state.nodePath!);
                if (absolutePath) {
                  const fileName = state.nodePath!.split('/').pop() || '';
                  onSaveAsTemplate(state.nodePath!, absolutePath, fileName);
                }
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Save as Template
            </button>
          )}

          {/* Folder color picker - only for folders */}
          {state.nodeType === 'folder' && (
            <>
              <div className="my-1 border-t border-slate-200" />
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    currentColor
                      ? FOLDER_COLORS.find(c => c.id === currentColor)?.bgClass
                      : 'bg-slate-200'
                  }`} />
                  Folder Color
                  <svg className={`w-3 h-3 ml-auto transition-transform ${showColorPicker ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>

                {showColorPicker && (
                  <div className="px-3 py-2 bg-slate-50">
                    <div className="flex gap-1.5 flex-wrap">
                      {/* No color option */}
                      <button
                        onClick={async () => {
                          await setFolderColor(projectPath, state.nodePath!, null);
                          setShowColorPicker(false);
                          onClose();
                        }}
                        className={`w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center hover:scale-110 transition-transform ${
                          currentColor === null ? 'ring-2 ring-slate-400 ring-offset-1' : 'border-slate-300'
                        }`}
                        title="No color"
                      >
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Color options */}
                      {FOLDER_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={async () => {
                            await setFolderColor(projectPath, state.nodePath!, color.id);
                            setShowColorPicker(false);
                            onClose();
                          }}
                          className={`w-6 h-6 rounded-full ${color.bgClass} hover:scale-110 transition-transform ${
                            currentColor === color.id ? 'ring-2 ring-slate-600 ring-offset-1' : ''
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="my-1 border-t border-slate-200" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </>
      )}
    </div>
  );
}
