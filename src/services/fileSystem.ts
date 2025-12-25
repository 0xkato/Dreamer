import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  FileNode,
  CanvasContent,
  AppSettings,
} from '../types/project';
import {
  DEFAULT_APP_SETTINGS,
} from '../types/project';
import type { CalendarData, CalendarEvent } from '../types/calendar';
import type { FolderColorsMap } from '../types/project';

// API base URL - in production this will be same origin
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// ============================================
// App Settings Operations
// ============================================

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetch(`${API_BASE}/api/settings`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to load app settings:', error);
  }
  return { ...DEFAULT_APP_SETTINGS };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const response = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save settings');
  }
}

// ============================================
// Project Operations
// ============================================

export async function listProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/api/projects`);
  if (!response.ok) {
    throw new Error('Failed to list projects');
  }
  return await response.json();
}

export async function createProject(_parentPath: string, name: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create project');
  }

  return await response.json();
}

export async function openProject(folderPath: string): Promise<Project> {
  // Extract project name from path
  const projectName = folderPath.split('/').pop() || folderPath;

  const response = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to open project');
  }

  return await response.json();
}

// ============================================
// File Tree Operations
// ============================================

export async function readDirectoryTree(
  projectPath: string,
  relativePath: string = ''
): Promise<FileNode[]> {
  const params = new URLSearchParams({ projectPath });
  if (relativePath) {
    params.append('relativePath', relativePath);
  }

  const response = await fetch(`${API_BASE}/api/files?${params}`);
  if (!response.ok) {
    throw new Error('Failed to read directory');
  }

  return await response.json();
}

export async function createFolder(
  projectPath: string,
  relativePath: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, relativePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create folder');
  }
}

export async function createFile(
  projectPath: string,
  relativePath: string,
  type: 'markdown' | 'canvas'
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, relativePath, type }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create file');
  }

  const result = await response.json();
  return result.path;
}

export async function deleteFileOrFolder(absolutePath: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/files`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ absolutePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete');
  }
}

export async function renameFileOrFolder(
  oldAbsolutePath: string,
  newName: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/files/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldAbsolutePath, newName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rename');
  }

  const result = await response.json();
  return result.newPath;
}

export async function moveFileOrFolder(
  sourceAbsolutePath: string,
  destFolderAbsolutePath: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/files/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceAbsolutePath, destFolderAbsolutePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to move');
  }

  const result = await response.json();
  return result.newPath;
}

// ============================================
// File Content Operations
// ============================================

export async function readMarkdownFile(absolutePath: string): Promise<string> {
  const params = new URLSearchParams({ absolutePath });
  const response = await fetch(`${API_BASE}/api/content/markdown?${params}`);

  if (!response.ok) {
    throw new Error('Failed to read file');
  }

  const result = await response.json();
  return result.content;
}

export async function writeMarkdownFile(
  absolutePath: string,
  content: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/content/markdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ absolutePath, content }),
  });

  if (!response.ok) {
    throw new Error('Failed to write file');
  }
}

export async function readCanvasFile(absolutePath: string): Promise<CanvasContent> {
  const params = new URLSearchParams({ absolutePath });
  const response = await fetch(`${API_BASE}/api/content/canvas?${params}`);

  if (!response.ok) {
    throw new Error('Failed to read canvas');
  }

  return await response.json();
}

export async function writeCanvasFile(
  absolutePath: string,
  content: CanvasContent
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/content/canvas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ absolutePath, content }),
  });

  if (!response.ok) {
    throw new Error('Failed to write canvas');
  }
}

// ============================================
// Calendar Operations
// ============================================

const CALENDAR_VERSION = '1.0.0';

export async function readCalendarFile(projectPath: string): Promise<CalendarData> {
  const params = new URLSearchParams({ projectPath });
  const response = await fetch(`${API_BASE}/api/calendar?${params}`);

  if (!response.ok) {
    // Return empty calendar on error
    return {
      version: CALENDAR_VERSION,
      events: [],
      todos: [],
    };
  }

  return await response.json();
}

export async function writeCalendarFile(
  projectPath: string,
  data: CalendarData
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, data }),
  });

  if (!response.ok) {
    throw new Error('Failed to save calendar');
  }
}

export async function addCalendarEvent(
  projectPath: string,
  event: CalendarEvent
): Promise<void> {
  const data = await readCalendarFile(projectPath);
  data.events.push(event);
  await writeCalendarFile(projectPath, data);
}

export async function updateCalendarEvent(
  projectPath: string,
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> {
  const data = await readCalendarFile(projectPath);
  const index = data.events.findIndex(e => e.id === eventId);

  if (index !== -1) {
    data.events[index] = { ...data.events[index], ...updates };
    await writeCalendarFile(projectPath, data);
  }
}

export async function deleteCalendarEvent(
  projectPath: string,
  eventId: string
): Promise<void> {
  const data = await readCalendarFile(projectPath);
  data.events = data.events.filter(e => e.id !== eventId);
  await writeCalendarFile(projectPath, data);
}

// ============================================
// Folder Colors Operations
// ============================================

export async function readFolderColors(projectPath: string): Promise<FolderColorsMap> {
  const params = new URLSearchParams({ projectPath });
  const response = await fetch(`${API_BASE}/api/folder-colors?${params}`);

  if (!response.ok) {
    return {};
  }

  return await response.json();
}

export async function writeFolderColors(
  projectPath: string,
  colors: FolderColorsMap
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/folder-colors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, colors }),
  });

  if (!response.ok) {
    throw new Error('Failed to save folder colors');
  }
}

// Helper to generate IDs (exposed for components that need it)
export function generateId(): string {
  return uuidv4();
}
