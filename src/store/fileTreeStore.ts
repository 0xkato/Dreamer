import { create } from 'zustand';
import type { FileNode, FolderColor, FolderColorsMap } from '../types/project';
import {
  readDirectoryTree,
  createFolder as fsCreateFolder,
  createFile as fsCreateFile,
  deleteFileOrFolder,
  renameFileOrFolder,
  moveFileOrFolder,
  readFolderColors,
  writeFolderColors,
} from '../services/fileSystem';

interface FileTreeStore {
  // State
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  folderColors: FolderColorsMap;
  colorFilter: FolderColor | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions
  setNodes: (nodes: FileNode[]) => void;
  setSelectedPath: (path: string | null) => void;
  toggleExpanded: (path: string) => void;
  expandPath: (path: string) => void;
  collapsePath: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Async file operations
  refreshTree: (projectPath: string) => Promise<void>;
  createFolder: (projectPath: string, parentPath: string, name: string) => Promise<void>;
  createFile: (projectPath: string, parentPath: string, name: string, type: 'markdown' | 'canvas') => Promise<string | null>;
  deleteNode: (projectPath: string, absolutePath: string) => Promise<void>;
  renameNode: (projectPath: string, absolutePath: string, newName: string) => Promise<void>;
  moveNode: (projectPath: string, sourceAbsolutePath: string, destFolderAbsolutePath: string) => Promise<void>;

  // Folder colors
  loadFolderColors: (projectPath: string) => Promise<void>;
  setFolderColor: (projectPath: string, folderPath: string, color: FolderColor) => Promise<void>;
  getFolderColor: (folderPath: string) => FolderColor;
  setColorFilter: (color: FolderColor | 'all') => void;

  // Helpers
  findNode: (path: string) => FileNode | null;
  getAllFiles: () => FileNode[];
  clearError: () => void;
}

// Helper to collect all folder paths
function collectFolderPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path);
      if (node.children) {
        paths.push(...collectFolderPaths(node.children));
      }
    }
  }
  return paths;
}

// Helper to find a node by path
function findNodeByPath(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

// Helper to collect all files recursively
function collectAllFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type !== 'folder') {
      files.push(node);
    }
    if (node.children) {
      files.push(...collectAllFiles(node.children));
    }
  }
  return files;
}

export const useFileTreeStore = create<FileTreeStore>((set, get) => ({
  nodes: [],
  expandedPaths: new Set<string>(),
  selectedPath: null,
  folderColors: {},
  colorFilter: 'all',
  isLoading: false,
  error: null,

  setNodes: (nodes) => set({ nodes }),

  setSelectedPath: (path) => set({ selectedPath: path }),

  toggleExpanded: (path) => {
    const { expandedPaths } = get();
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    set({ expandedPaths: newExpanded });
  },

  expandPath: (path) => {
    const { expandedPaths } = get();
    if (!expandedPaths.has(path)) {
      set({ expandedPaths: new Set([...expandedPaths, path]) });
    }
  },

  collapsePath: (path) => {
    const { expandedPaths } = get();
    if (expandedPaths.has(path)) {
      const newExpanded = new Set(expandedPaths);
      newExpanded.delete(path);
      set({ expandedPaths: newExpanded });
    }
  },

  expandAll: () => {
    const { nodes } = get();
    const allFolderPaths = collectFolderPaths(nodes);
    set({ expandedPaths: new Set(allFolderPaths) });
  },

  collapseAll: () => {
    set({ expandedPaths: new Set() });
  },

  refreshTree: async (projectPath) => {
    set({ isLoading: true, error: null });
    try {
      const nodes = await readDirectoryTree(projectPath);
      set({ nodes, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to read directory',
      });
    }
  },

  createFolder: async (projectPath, parentPath, name) => {
    set({ error: null });
    try {
      const relativePath = parentPath ? `${parentPath}/${name}` : name;
      await fsCreateFolder(projectPath, relativePath);
      await get().refreshTree(projectPath);
      // Auto-expand parent if it exists
      if (parentPath) {
        get().expandPath(parentPath);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create folder',
      });
      throw error;
    }
  },

  createFile: async (projectPath, parentPath, name, type) => {
    set({ error: null });
    try {
      const relativePath = parentPath ? `${parentPath}/${name}` : name;
      const createdPath = await fsCreateFile(projectPath, relativePath, type);
      await get().refreshTree(projectPath);
      // Auto-expand parent if it exists
      if (parentPath) {
        get().expandPath(parentPath);
      }
      // Select the new file
      set({ selectedPath: createdPath });
      return createdPath;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create file',
      });
      return null;
    }
  },

  deleteNode: async (projectPath, absolutePath) => {
    const { selectedPath, nodes } = get();
    set({ error: null });
    try {
      // Find the node to get its relative path
      const nodeToDelete = findNodeByPath(nodes, absolutePath) ||
                           nodes.find(n => n.absolutePath === absolutePath);

      await deleteFileOrFolder(absolutePath);
      await get().refreshTree(projectPath);

      // Clear selection if deleted file was selected
      if (selectedPath && nodeToDelete && selectedPath === nodeToDelete.path) {
        set({ selectedPath: null });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete',
      });
      throw error;
    }
  },

  renameNode: async (projectPath, absolutePath, newName) => {
    set({ error: null });
    try {
      await renameFileOrFolder(absolutePath, newName);
      await get().refreshTree(projectPath);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to rename',
      });
      throw error;
    }
  },

  moveNode: async (projectPath, sourceAbsolutePath, destFolderAbsolutePath) => {
    set({ error: null });
    try {
      await moveFileOrFolder(sourceAbsolutePath, destFolderAbsolutePath);
      await get().refreshTree(projectPath);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move',
      });
      throw error;
    }
  },

  // Folder colors
  loadFolderColors: async (projectPath) => {
    try {
      const colors = await readFolderColors(projectPath);
      set({ folderColors: colors });
    } catch (error) {
      console.error('Failed to load folder colors:', error);
    }
  },

  setFolderColor: async (projectPath, folderPath, color) => {
    const { folderColors } = get();
    const newColors = { ...folderColors };

    if (color === null) {
      delete newColors[folderPath];
    } else {
      newColors[folderPath] = color;
    }

    set({ folderColors: newColors });

    try {
      await writeFolderColors(projectPath, newColors);
    } catch (error) {
      // Revert on error
      set({ folderColors });
      throw error;
    }
  },

  getFolderColor: (folderPath) => {
    return get().folderColors[folderPath] || null;
  },

  setColorFilter: (color) => {
    set({ colorFilter: color });
  },

  findNode: (path) => {
    return findNodeByPath(get().nodes, path);
  },

  getAllFiles: () => {
    return collectAllFiles(get().nodes);
  },

  clearError: () => set({ error: null }),
}));
