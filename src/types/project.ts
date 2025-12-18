import type { CanvasElement, ConnectorElement, ViewportState } from './index';

// Project types
export interface Project {
  id: string;
  name: string;
  path: string; // Absolute path on disk
  createdAt: string;
  lastOpenedAt: string;
}

export interface ProjectMetadata {
  version: string;
  name: string;
  created: string;
  modified: string;
}

// File system types
export type FileType = 'folder' | 'markdown' | 'canvas';

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  path: string; // Relative path from project root
  absolutePath: string;
  children?: FileNode[]; // For folders only
  parentPath: string | null; // Parent folder path, null for root items
}

export interface FileTreeState {
  root: FileNode | null;
  expandedFolders: Set<string>;
  selectedFile: string | null;
}

// Content types
export interface MarkdownContent {
  type: 'markdown';
  text: string;
}

export interface CanvasContent {
  type: 'canvas';
  elements: CanvasElement[];
  connectors: ConnectorElement[];
  viewport: ViewportState;
}

export type FileContent = MarkdownContent | CanvasContent;

// Active file state
export interface OpenFile {
  id: string;
  path: string; // Relative path
  absolutePath: string;
  name: string;
  type: 'markdown' | 'canvas';
  isDirty: boolean;
  content: FileContent;
}

// App settings persisted in Tauri app data
export interface AppSettings {
  recentProjects: Project[];
  lastOpenedProjectPath: string | null;
  theme: 'light' | 'dark' | 'system';
  editorFontSize: number;
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds
}

// File format for .canvas files
export interface CanvasFile {
  version: string;
  type: 'canvas';
  metadata: {
    created: string;
    modified: string;
  };
  viewport: ViewportState;
  elements: CanvasElement[];
  connectors: ConnectorElement[];
}

// File format for .dreamer-project files
export interface ProjectFile {
  version: string;
  name: string;
  created: string;
  settings: {
    defaultFileType: 'markdown' | 'canvas';
    autoSave: boolean;
  };
}

// Default values
export const DEFAULT_APP_SETTINGS: AppSettings = {
  recentProjects: [],
  lastOpenedProjectPath: null,
  theme: 'system',
  editorFontSize: 14,
  autoSaveEnabled: true,
  autoSaveInterval: 30000, // 30 seconds
};

export const DEFAULT_PROJECT_SETTINGS: ProjectFile['settings'] = {
  defaultFileType: 'markdown',
  autoSave: true,
};
