import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../store';

interface ProjectSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'open';
}

export function ProjectSelector({ isOpen, onClose, mode }: ProjectSelectorProps) {
  const [projectName, setProjectName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    createProject,
    openProject,
    loadAvailableProjects,
    availableProjects,
    isLoading,
    error,
    clearError
  } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      clearError();
      // Focus input after a small delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);

      // Load available projects when opening in 'open' mode
      if (mode === 'open') {
        loadAvailableProjects();
      }
    }
  }, [isOpen, clearError, mode, loadAvailableProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      if (!projectName.trim()) return;
      const project = await createProject(projectName.trim());
      if (project) {
        onClose();
      }
    }
  };

  const handleProjectClick = async (projectPath: string) => {
    const project = await openProject(projectPath);
    if (project) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {mode === 'create' ? 'Create New Project' : 'Open Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name
                </label>
                <input
                  ref={inputRef}
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Your project will be created on the server. All notes and canvases will be stored there.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectName.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Create Project
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Select a project to open:
              </p>

              {/* Project list */}
              <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {availableProjects.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No projects found. Create a new project to get started.
                  </div>
                ) : (
                  availableProjects.map((project) => (
                    <button
                      key={project.path}
                      onClick={() => handleProjectClick(project.path)}
                      disabled={isLoading}
                      className="w-full px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">{project.name}</div>
                        <div className="text-xs text-slate-400">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
