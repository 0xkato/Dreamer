import { create } from 'zustand';
import type { Template, TemplateMetadata } from '../services/templateService';
import { loadTemplates, saveAsTemplate, SYMBOLS } from '../services/templateService';

interface TemplateStore {
  // State
  templates: Template[];
  isLoading: boolean;
  error: string | null;

  // Slash menu state
  slashMenuOpen: boolean;
  slashMenuPosition: { x: number; y: number } | null;
  slashFilter: string;

  // Actions
  fetchTemplates: (projectPath?: string) => Promise<void>;
  saveTemplate: (
    content: string,
    metadata: TemplateMetadata,
    location: 'global' | 'project',
    projectPath?: string
  ) => Promise<void>;

  // Slash menu actions
  openSlashMenu: (position: { x: number; y: number }) => void;
  closeSlashMenu: () => void;
  setSlashFilter: (filter: string) => void;

  // Helpers
  getFilteredItems: () => Array<{ type: 'symbol' | 'snippet'; item: typeof SYMBOLS[number] | Template }>;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,
  slashMenuOpen: false,
  slashMenuPosition: null,
  slashFilter: '',

  fetchTemplates: async (projectPath) => {
    set({ isLoading: true, error: null });
    try {
      const templates = await loadTemplates(projectPath);
      set({ templates, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load templates',
      });
    }
  },

  saveTemplate: async (content, metadata, location, projectPath) => {
    set({ isLoading: true, error: null });
    try {
      await saveAsTemplate(content, metadata, location, projectPath);
      // Refresh templates after saving
      const templates = await loadTemplates(projectPath);
      set({ templates, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save template',
      });
      throw error;
    }
  },

  openSlashMenu: (position) => {
    set({ slashMenuOpen: true, slashMenuPosition: position, slashFilter: '' });
  },

  closeSlashMenu: () => {
    set({ slashMenuOpen: false, slashMenuPosition: null, slashFilter: '' });
  },

  setSlashFilter: (filter) => {
    set({ slashFilter: filter });
  },

  getFilteredItems: () => {
    const { templates, slashFilter } = get();
    const filter = slashFilter.toLowerCase();
    const items: Array<{ type: 'symbol' | 'snippet'; item: typeof SYMBOLS[number] | Template }> = [];

    // Add matching symbols
    for (const symbol of SYMBOLS) {
      if (
        filter === '' ||
        symbol.command.includes(filter) ||
        symbol.description.toLowerCase().includes(filter)
      ) {
        items.push({ type: 'symbol', item: symbol });
      }
    }

    // Add matching snippets
    for (const template of templates) {
      if (template.type !== 'snippet') continue;
      if (
        filter === '' ||
        template.name.toLowerCase().includes(filter) ||
        template.category?.toLowerCase().includes(filter)
      ) {
        items.push({ type: 'snippet', item: template });
      }
    }

    return items;
  },

  clearError: () => set({ error: null }),
}));
