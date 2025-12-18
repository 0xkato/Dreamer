import { create } from 'zustand';
import type { Project, AppSettings } from '../types/project';
import { DEFAULT_APP_SETTINGS } from '../types/project';
import {
  loadAppSettings,
  saveAppSettings,
  createProject as fsCreateProject,
  openProject as fsOpenProject,
  listProjects,
} from '../services/fileSystem';

interface ProjectStore {
  // Current project
  currentProject: Project | null;

  // App settings (includes recent projects)
  settings: AppSettings;

  // Available projects on server
  availableProjects: Project[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;

  // Async actions
  initialize: () => Promise<void>;
  loadAvailableProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project | null>;
  openProject: (path?: string) => Promise<Project | null>;
  openRecentProject: (project: Project) => Promise<Project | null>;
  closeProject: () => void;
  removeFromRecent: (projectId: string) => void;
  clearError: () => void;
}

const MAX_RECENT_PROJECTS = 10;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  settings: DEFAULT_APP_SETTINGS,
  availableProjects: [],
  isLoading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await loadAppSettings();
      set({ settings, isLoading: false });

      // Load available projects
      get().loadAvailableProjects();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize'
      });
    }
  },

  loadAvailableProjects: async () => {
    try {
      const projects = await listProjects();
      set({ availableProjects: projects });
    } catch (error) {
      console.error('Failed to load available projects:', error);
    }
  },

  createProject: async (name) => {
    set({ isLoading: true, error: null });
    try {
      // In web version, projects are created on the server
      const project = await fsCreateProject('', name);

      // Update recent projects
      const { settings } = get();
      const recentProjects = [
        project,
        ...settings.recentProjects.filter(p => p.path !== project.path)
      ].slice(0, MAX_RECENT_PROJECTS);

      const newSettings: AppSettings = {
        ...settings,
        recentProjects,
        lastOpenedProjectPath: project.path,
      };

      await saveAppSettings(newSettings);

      // Refresh available projects
      get().loadAvailableProjects();

      set({
        currentProject: project,
        settings: newSettings,
        isLoading: false
      });

      return project;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      });
      return null;
    }
  },

  openProject: async (path) => {
    set({ isLoading: true, error: null });
    try {
      if (!path) {
        // In web version, we don't use folder dialogs
        // The UI should show a project list instead
        set({ isLoading: false });
        return null;
      }

      const project = await fsOpenProject(path);

      // Update recent projects
      const { settings } = get();
      const recentProjects = [
        project,
        ...settings.recentProjects.filter(p => p.path !== project.path)
      ].slice(0, MAX_RECENT_PROJECTS);

      const newSettings: AppSettings = {
        ...settings,
        recentProjects,
        lastOpenedProjectPath: project.path,
      };

      await saveAppSettings(newSettings);

      set({
        currentProject: project,
        settings: newSettings,
        isLoading: false
      });

      return project;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to open project'
      });
      return null;
    }
  },

  openRecentProject: async (project) => {
    return get().openProject(project.path);
  },

  closeProject: () => {
    set({ currentProject: null, error: null });
  },

  removeFromRecent: async (projectId) => {
    const { settings } = get();
    const recentProjects = settings.recentProjects.filter(p => p.id !== projectId);
    const newSettings = { ...settings, recentProjects };

    try {
      await saveAppSettings(newSettings);
      set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to update recent projects:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
