import { useState, useRef, useEffect } from 'react';
import { useFileTreeStore, useEditorStore, useProjectStore, useTemplateStore } from '../../store';
import { getTemplateContent } from '../../services/templateService';
import type { Template } from '../../services/templateService';

interface NewFileDialogProps {
  type: 'markdown' | 'canvas' | 'folder';
  parentPath: string;
  onClose: () => void;
  projectPath: string;
}

export function NewFileDialog({ type, parentPath, onClose, projectPath }: NewFileDialogProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { createFolder, createFile } = useFileTreeStore();
  const { openFile } = useEditorStore();
  const { currentProject } = useProjectStore();
  const { templates, fetchTemplates } = useTemplateStore();

  // Load templates on mount for markdown files
  useEffect(() => {
    if (type === 'markdown') {
      fetchTemplates(projectPath);
    }
  }, [type, projectPath, fetchTemplates]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getTitle = () => {
    switch (type) {
      case 'markdown': return 'New Markdown File';
      case 'canvas': return 'New Canvas';
      case 'folder': return 'New Folder';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'markdown': return 'my-note';
      case 'canvas': return 'my-diagram';
      case 'folder': return 'folder-name';
    }
  };

  // Filter templates to show only "new file" templates (not snippets)
  const fileTemplates = templates.filter((t) => t.type === 'template');
  const projectTemplates = fileTemplates.filter((t) => t.location === 'project');
  const globalTemplates = fileTemplates.filter((t) => t.location === 'global');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      if (type === 'folder') {
        await createFolder(projectPath, parentPath, name.trim());
      } else {
        const createdPath = await createFile(projectPath, parentPath, name.trim(), type);

        // Open the newly created file
        if (createdPath && currentProject) {
          await openFile(currentProject.path, createdPath, type);

          // If a template was selected, apply it (for markdown only)
          if (type === 'markdown' && selectedTemplate) {
            const templateContent = getTemplateContent(selectedTemplate, name.trim());
            // The file was just opened, so we need to update the content
            // This will be done through the editor store
            const { updateMarkdownContent } = useEditorStore.getState();
            updateMarkdownContent(createdPath, templateContent);
          }
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-800">{getTitle()}</h3>
          </div>

          <div className="p-4">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              disabled={isCreating}
            />

            {parentPath && (
              <p className="mt-2 text-xs text-slate-400">
                Location: /{parentPath}/
              </p>
            )}

            {/* Template picker for markdown files */}
            {type === 'markdown' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Template
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                  {/* Blank option */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                      selectedTemplate === null
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">📄</span>
                    <span>Blank</span>
                  </button>

                  {/* Project templates */}
                  {projectTemplates.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-50 border-t border-slate-200">
                        Project
                      </div>
                      {projectTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                            selectedTemplate?.id === template.id
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-slate-400">📋</span>
                          <span>{template.name}</span>
                          {template.category && (
                            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {template.category}
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Global templates */}
                  {globalTemplates.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-50 border-t border-slate-200">
                        Global
                      </div>
                      {globalTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                            selectedTemplate?.id === template.id
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-slate-400">📋</span>
                          <span>{template.name}</span>
                          {template.category && (
                            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {template.category}
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* No templates hint */}
                  {fileTemplates.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400 border-t border-slate-200">
                      Save any file as a template to see it here.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
