import { create } from 'zustand';
import type { OpenFile, FileContent, MarkdownContent, CanvasContent } from '../types/project';
import {
  readMarkdownFile,
  writeMarkdownFile,
  readCanvasFile,
  writeCanvasFile,
} from '../services/fileSystem';

// Simple path join for web (paths are handled by backend)
function joinPath(base: string, relative: string): string {
  // Normalize and join paths
  const cleanBase = base.replace(/\/+$/, '');
  const cleanRelative = relative.replace(/^\/+/, '');
  return `${cleanBase}/${cleanRelative}`;
}

interface EditorStore {
  // Open files (for future tab support)
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number;

  // Actions
  setActiveFile: (path: string | null) => void;

  // File operations
  openFile: (projectPath: string, relativePath: string, type: 'markdown' | 'canvas') => Promise<void>;
  closeFile: (path: string) => void;
  closeAllFiles: () => void;

  // Content updates
  updateMarkdownContent: (path: string, text: string) => void;
  updateCanvasContent: (path: string, content: Omit<CanvasContent, 'type'>) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;

  // Save operations
  saveFile: (projectPath: string, path: string) => Promise<void>;
  saveActiveFile: (projectPath: string) => Promise<void>;
  saveAllDirtyFiles: (projectPath: string) => Promise<void>;

  // Path update (for rename)
  updateFilePath: (oldPath: string, newPath: string, newAbsolutePath: string, newName: string) => void;

  // Auto-save config
  setAutoSave: (enabled: boolean, interval?: number) => void;

  // Helpers
  getActiveFile: () => OpenFile | null;
  isDirty: (path: string) => boolean;
  hasUnsavedChanges: () => boolean;
  clearError: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  openFiles: new Map(),
  activeFilePath: null,
  isLoading: false,
  isSaving: false,
  error: null,
  autoSaveEnabled: true,
  autoSaveInterval: 30000,

  setActiveFile: (path) => set({ activeFilePath: path }),

  openFile: async (projectPath, relativePath, type) => {
    const { activeFilePath } = get();

    // Check if already open and active
    if (activeFilePath === relativePath) {
      return;
    }

    // Note: We don't auto-save here anymore. The caller should handle
    // checking for unsaved changes and prompting the user before calling this.
    // Canvas files are auto-saved via subscription in App.tsx.
    // Markdown files require manual save or save-on-exit prompt.

    set({ isLoading: true, error: null });

    try {
      const absolutePath = joinPath(projectPath, relativePath);
      const fileName = relativePath.split('/').pop() || relativePath;

      let content: FileContent;

      if (type === 'markdown') {
        const text = await readMarkdownFile(absolutePath);
        content = { type: 'markdown', text };
      } else {
        content = await readCanvasFile(absolutePath);
      }

      const openFile: OpenFile = {
        id: relativePath,
        path: relativePath,
        absolutePath,
        name: fileName,
        type,
        isDirty: false,
        content,
      };

      // Single-file mode: replace all open files with just this one
      const newOpenFiles = new Map<string, OpenFile>();
      newOpenFiles.set(relativePath, openFile);

      set({
        openFiles: newOpenFiles,
        activeFilePath: relativePath,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to open file',
      });
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFilePath } = get();
    const newOpenFiles = new Map(openFiles);
    newOpenFiles.delete(path);

    // If closing active file, switch to another or null
    let newActiveFile = activeFilePath;
    if (activeFilePath === path) {
      const remainingPaths = Array.from(newOpenFiles.keys());
      newActiveFile = remainingPaths.length > 0 ? remainingPaths[0] : null;
    }

    set({
      openFiles: newOpenFiles,
      activeFilePath: newActiveFile,
    });
  },

  closeAllFiles: () => {
    set({
      openFiles: new Map(),
      activeFilePath: null,
    });
  },

  updateMarkdownContent: (path, text) => {
    const { openFiles } = get();
    const file = openFiles.get(path);

    if (!file || file.type !== 'markdown') return;

    const newOpenFiles = new Map(openFiles);
    newOpenFiles.set(path, {
      ...file,
      isDirty: true,
      content: { type: 'markdown', text },
    });

    set({ openFiles: newOpenFiles });
  },

  updateCanvasContent: (path, content) => {
    const { openFiles } = get();
    const file = openFiles.get(path);

    if (!file || file.type !== 'canvas') return;

    const newOpenFiles = new Map(openFiles);
    newOpenFiles.set(path, {
      ...file,
      isDirty: true,
      content: { type: 'canvas', ...content },
    });

    set({ openFiles: newOpenFiles });
  },

  markDirty: (path) => {
    const { openFiles } = get();
    const file = openFiles.get(path);

    if (!file || file.isDirty) return;

    const newOpenFiles = new Map(openFiles);
    newOpenFiles.set(path, { ...file, isDirty: true });
    set({ openFiles: newOpenFiles });
  },

  markClean: (path) => {
    const { openFiles } = get();
    const file = openFiles.get(path);

    if (!file || !file.isDirty) return;

    const newOpenFiles = new Map(openFiles);
    newOpenFiles.set(path, { ...file, isDirty: false });
    set({ openFiles: newOpenFiles });
  },

  saveFile: async (projectPath, path) => {
    const { openFiles } = get();
    const file = openFiles.get(path);

    if (!file) return;

    set({ isSaving: true, error: null });

    try {
      const absolutePath = joinPath(projectPath, path);

      if (file.type === 'markdown') {
        const content = file.content as MarkdownContent;
        await writeMarkdownFile(absolutePath, content.text);
      } else {
        const content = file.content as CanvasContent;
        await writeCanvasFile(absolutePath, content);
      }

      // Mark as clean
      const newOpenFiles = new Map(openFiles);
      newOpenFiles.set(path, { ...file, isDirty: false });

      set({ openFiles: newOpenFiles, isSaving: false });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      });
    }
  },

  saveActiveFile: async (projectPath) => {
    const { activeFilePath, saveFile } = get();
    if (activeFilePath) {
      await saveFile(projectPath, activeFilePath);
    }
  },

  saveAllDirtyFiles: async (projectPath) => {
    const { openFiles, saveFile } = get();

    const dirtyFiles = Array.from(openFiles.entries())
      .filter(([_, file]) => file.isDirty);

    for (const [path] of dirtyFiles) {
      await saveFile(projectPath, path);
    }
  },

  updateFilePath: (oldPath, newPath, newAbsolutePath, newName) => {
    const { openFiles, activeFilePath } = get();
    const file = openFiles.get(oldPath);

    if (!file) return;

    // Create new map with updated path
    const newOpenFiles = new Map(openFiles);
    newOpenFiles.delete(oldPath);
    newOpenFiles.set(newPath, {
      ...file,
      id: newPath,
      path: newPath,
      absolutePath: newAbsolutePath,
      name: newName,
    });

    // Update active file path if it was the renamed file
    const newActiveFilePath = activeFilePath === oldPath ? newPath : activeFilePath;

    set({
      openFiles: newOpenFiles,
      activeFilePath: newActiveFilePath,
    });
  },

  setAutoSave: (enabled, interval) => {
    set({
      autoSaveEnabled: enabled,
      ...(interval !== undefined && { autoSaveInterval: interval }),
    });
  },

  getActiveFile: () => {
    const { openFiles, activeFilePath } = get();
    if (!activeFilePath) return null;
    return openFiles.get(activeFilePath) || null;
  },

  isDirty: (path) => {
    const { openFiles } = get();
    const file = openFiles.get(path);
    return file?.isDirty ?? false;
  },

  hasUnsavedChanges: () => {
    const { openFiles } = get();
    return Array.from(openFiles.values()).some(file => file.isDirty);
  },

  clearError: () => set({ error: null }),
}));
