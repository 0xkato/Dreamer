import type { DiagramFile } from '../types';

const STORAGE_KEY = 'dreamer_diagrams';

export interface SavedDiagram {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: DiagramFile;
}

// Get all saved diagrams
export function getSavedDiagrams(): SavedDiagram[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Save a diagram
export function saveDiagram(name: string, data: DiagramFile): SavedDiagram {
  const diagrams = getSavedDiagrams();

  // Check if diagram with same name exists
  const existingIndex = diagrams.findIndex(d => d.name === name);

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    // Update existing
    diagrams[existingIndex] = {
      ...diagrams[existingIndex],
      updatedAt: now,
      data,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
    return diagrams[existingIndex];
  } else {
    // Create new
    const newDiagram: SavedDiagram = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      data,
    };
    diagrams.push(newDiagram);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
    return newDiagram;
  }
}

// Load a diagram by id
export function loadDiagram(id: string): SavedDiagram | null {
  const diagrams = getSavedDiagrams();
  return diagrams.find(d => d.id === id) || null;
}

// Delete a diagram
export function deleteDiagram(id: string): void {
  const diagrams = getSavedDiagrams();
  const filtered = diagrams.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Rename a diagram
export function renameDiagram(id: string, newName: string): void {
  const diagrams = getSavedDiagrams();
  const diagram = diagrams.find(d => d.id === id);
  if (diagram) {
    diagram.name = newName;
    diagram.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
  }
}

// Export diagram to file (download)
export function exportDiagram(data: DiagramFile, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dreamer') ? filename : `${filename}.dreamer`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import diagram from file
export function importDiagramFromFile(file: File): Promise<DiagramFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as DiagramFile;
        resolve(data);
      } catch {
        reject(new Error('Failed to parse diagram file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
