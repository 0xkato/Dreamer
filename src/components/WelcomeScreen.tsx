import { useState } from 'react';
import { useProjectStore } from '../store';
import { ProjectSelector } from './ProjectSelector';
import { hasLegacyData, clearLegacyData } from '../services/fileSystem';

export function WelcomeScreen() {
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'create' | 'open'>('create');
  const [showLegacyNotice, setShowLegacyNotice] = useState(hasLegacyData());

  const { settings, openRecentProject, isLoading, error, clearError } = useProjectStore();
  const recentProjects = settings.recentProjects;

  const handleDismissLegacy = () => {
    clearLegacyData();
    setShowLegacyNotice(false);
  };

  const handleCreate = () => {
    setSelectorMode('create');
    setShowProjectSelector(true);
  };

  const handleOpen = () => {
    setSelectorMode('open');
    setShowProjectSelector(true);
  };

  const handleRecentClick = async (project: typeof recentProjects[0]) => {
    await openRecentProject(project);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto px-8">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Dreamer</h1>
          <p className="text-slate-500">Create diagrams and take notes, all in one place.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Legacy data notice */}
        {showLegacyNotice && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-amber-800 text-sm font-medium">Existing diagrams detected</p>
                <p className="text-amber-700 text-sm mt-1">
                  You have diagrams from a previous version. Create a new project and they'll be migrated automatically.
                </p>
              </div>
              <button
                onClick={handleDismissLegacy}
                className="text-amber-600 hover:text-amber-800 p-1"
                title="Dismiss and clear old data"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="group p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center mb-4 transition-colors">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Create Project</h3>
            <p className="text-sm text-slate-500">Start a new workspace for your notes and diagrams</p>
          </button>

          <button
            onClick={handleOpen}
            disabled={isLoading}
            className="group p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center mb-4 transition-colors">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Open Project</h3>
            <p className="text-sm text-slate-500">Open an existing project from your computer</p>
          </button>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
              Recent Projects
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {recentProjects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleRecentClick(project)}
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
                    <div className="text-xs text-slate-400 truncate">{project.path}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-slate-700">Loading project...</span>
            </div>
          </div>
        )}
      </div>

      {/* Project selector dialog */}
      <ProjectSelector
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        mode={selectorMode}
      />
    </div>
  );
}
