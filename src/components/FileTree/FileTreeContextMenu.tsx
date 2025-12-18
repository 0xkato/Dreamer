import { useEffect, useRef } from 'react';
import { useFileTreeStore } from '../../store';
import type { FileNode } from '../../types/project';

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
  projectPath: string;
}

export function FileTreeContextMenu({ state, onClose, onNewFile, projectPath }: FileTreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { deleteNode, nodes } = useFileTreeStore();

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

      {/* Separator and delete option for files/folders */}
      {state.nodePath && state.nodeType !== 'root' && (
        <>
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
