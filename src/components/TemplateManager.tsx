import { useState, useEffect } from 'react';
import { useTemplateStore, useProjectStore } from '../store';
import type { Template } from '../services/templateService';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'templates' | 'snippets';

export function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { currentProject } = useProjectStore();
  const { templates, fetchTemplates, deleteTemplate, isLoading } = useTemplateStore();

  useEffect(() => {
    if (isOpen && currentProject) {
      fetchTemplates(currentProject.path);
    }
  }, [isOpen, currentProject, fetchTemplates]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fileTemplates = templates.filter((t) => t.type === 'template');
  const snippets = templates.filter((t) => t.type === 'snippet');
  const currentItems = activeTab === 'templates' ? fileTemplates : snippets;

  const handleDelete = async (template: Template) => {
    try {
      await deleteTemplate(template, currentProject?.path);
      setConfirmDeleteId(null);
      setExpandedId(null);
    } catch {
      // Error is handled by the store
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setConfirmDeleteId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Templates & Snippets
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setActiveTab('templates'); setExpandedId(null); setConfirmDeleteId(null); }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Templates
            {fileTemplates.length > 0 && (
              <span className="ml-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {fileTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('snippets'); setExpandedId(null); setConfirmDeleteId(null); }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'snippets'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Snippets
            {snippets.length > 0 && (
              <span className="ml-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                {snippets.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-slate-400 dark:text-slate-500">Loading...</div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {activeTab === 'templates' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  )}
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                No {activeTab === 'templates' ? 'templates' : 'snippets'} yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
                {activeTab === 'templates'
                  ? 'Save a file as a template to use it when creating new files.'
                  : 'Create snippets to quickly insert text via the slash command menu.'}
              </p>
            </div>
          ) : (
            <div>
              {currentItems.map((template) => (
                <div key={template.id}>
                  <div
                    className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => handleToggleExpand(template.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {template.type === 'template' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          )}
                        </svg>
                      </div>

                      {/* Name and badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {template.name}
                          </span>
                          <span
                            className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${
                              template.location === 'project'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {template.location === 'project' ? 'Project' : 'Global'}
                          </span>
                          {template.category && (
                            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {template.category}
                            </span>
                          )}
                        </div>
                        {/* Content preview (first line) */}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {template.content.split('\n')[0] || '(empty)'}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === template.id ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded content preview */}
                  {expandedId === template.id && (
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                      <pre className="bg-slate-100 dark:bg-slate-900 rounded p-3 text-xs font-mono max-h-40 overflow-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {template.content || '(empty template)'}
                      </pre>
                      <div className="flex justify-end mt-3 gap-2">
                        {confirmDeleteId === template.id ? (
                          <>
                            <span className="text-xs text-red-500 dark:text-red-400 self-center mr-2">
                              Delete this {template.type}?
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(template); }}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              Confirm Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(template.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
