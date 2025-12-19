import { useState, useEffect } from 'react';
import type { FileNode, FolderColor } from '../../types/project';
import { FOLDER_COLORS } from '../../types/project';
import { useFileTreeStore, useProjectStore } from '../../store';

// Global drag state (shared across all nodes)
let draggedNode: FileNode | null = null;
let dragListeners: Set<() => void> = new Set();

function setDraggedNode(node: FileNode | null) {
  draggedNode = node;
  dragListeners.forEach(fn => fn());
}

function useDraggedNode() {
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const listener = () => forceUpdate({});
    dragListeners.add(listener);
    return () => { dragListeners.delete(listener); };
  }, []);
  return draggedNode;
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  activeFilePath: string | null;
  onSelect: (path: string) => void;
  onDoubleClick: (path: string, type: 'markdown' | 'canvas') => void;
  onContextMenu: (e: React.MouseEvent, path: string, type: 'folder' | 'markdown' | 'canvas') => void;
}

export function FileTreeNode({
  node,
  depth,
  expandedPaths,
  selectedPath,
  activeFilePath,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: FileTreeNodeProps) {
  const { toggleExpanded, moveNode, expandPath, getFolderColor } = useFileTreeStore();
  const { currentProject } = useProjectStore();
  const folderColor = node.type === 'folder' ? getFolderColor(node.path) : null;
  const [isHovered, setIsHovered] = useState(false);
  const currentDraggedNode = useDraggedNode();

  const isExpanded = node.type === 'folder' && expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isActive = activeFilePath === node.path;
  const isDragging = currentDraggedNode?.path === node.path;
  const isDragOver = isHovered && currentDraggedNode !== null && node.type === 'folder' && currentDraggedNode.path !== node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);

    if (node.type === 'folder') {
      toggleExpanded(node.path);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type !== 'folder') {
      onDoubleClick(node.path, node.type);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.path);
    onContextMenu(e, node.path, node.type);
  };

  // Mouse-based drag and drop (more reliable than HTML5 drag/drop)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click, and not if clicking on expand arrow area
    if (e.button !== 0) return;

    // Start drag after a small movement threshold
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);

      if (!hasMoved && (dx > 5 || dy > 5)) {
        hasMoved = true;
        setDraggedNode(node);
      }
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const nodeToDrop = draggedNode;

      if (hasMoved && nodeToDrop) {
        const elementsUnder = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
        const dropTarget = elementsUnder.find(el => el.getAttribute('data-drop-target') === 'true');

        if (dropTarget && currentProject) {
          const targetPath = dropTarget.getAttribute('data-node-path');
          const targetAbsPath = dropTarget.getAttribute('data-node-abspath');

          // targetPath can be "" for root, so check for null explicitly
          if (targetPath !== null && targetAbsPath && nodeToDrop.absolutePath !== targetAbsPath) {
            // Don't drop into itself or its children
            if (!targetAbsPath.startsWith(nodeToDrop.absolutePath + '/')) {
              // Check if file is already in this location
              const nodeParentPath = nodeToDrop.path.includes('/')
                ? nodeToDrop.path.substring(0, nodeToDrop.path.lastIndexOf('/'))
                : '';

              if (nodeParentPath !== targetPath) {
                try {
                  await moveNode(currentProject.path, nodeToDrop.absolutePath, targetAbsPath);
                  if (targetPath) {
                    expandPath(targetPath);
                  }
                } catch (error) {
                  console.error('Failed to move file:', error);
                }
              }
            }
          }
        }
      }

      setDraggedNode(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Auto-expand folder when dragging over it
    if (currentDraggedNode && node.type === 'folder' && !expandedPaths.has(node.path)) {
      setTimeout(() => {
        if (draggedNode && node.type === 'folder') {
          expandPath(node.path);
        }
      }, 500);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Get the color class for folder icon
  const getFolderColorClass = (color: FolderColor): string => {
    const colorConfig = FOLDER_COLORS.find(c => c.id === color);
    return colorConfig?.textClass || 'text-amber-500';
  };

  const getIcon = () => {
    if (node.type === 'folder') {
      const colorClass = getFolderColorClass(folderColor);
      return isExpanded ? (
        <svg className={`w-4 h-4 ${colorClass}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
        </svg>
      ) : (
        <svg className={`w-4 h-4 ${colorClass}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      );
    }

    if (node.type === 'markdown') {
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    // Canvas
    return (
      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      </svg>
    );
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm transition-colors select-none
          ${isActive ? 'bg-indigo-100 text-indigo-800' : ''}
          ${isSelected && !isActive ? 'bg-slate-200' : ''}
          ${!isSelected && !isActive && !isDragOver ? 'hover:bg-slate-100' : ''}
          ${isDragOver ? 'bg-indigo-200 ring-2 ring-indigo-400' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-drop-target={node.type === 'folder' ? 'true' : 'false'}
        data-node-path={node.path}
        data-node-abspath={node.absolutePath}
      >
        {/* Expand/collapse arrow for folders */}
        {node.type === 'folder' ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* File/folder icon */}
        <span className="flex-shrink-0">{getIcon()}</span>

        {/* Name */}
        <span className="truncate">{node.name}</span>

        {/* Drop indicator for folders */}
        {isDragOver && node.type === 'folder' && (
          <span className="ml-auto text-xs text-indigo-600 font-medium">Drop here</span>
        )}
      </div>

      {/* Children */}
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              activeFilePath={activeFilePath}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
