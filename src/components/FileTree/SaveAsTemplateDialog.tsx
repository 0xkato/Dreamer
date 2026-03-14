import { useState, useRef, useEffect } from 'react';
import { useTemplateStore, useProjectStore } from '../../store';

interface SaveAsTemplateDialogProps {
  fileName: string;
  content: string;
  onClose: () => void;
}

export function SaveAsTemplateDialog({ fileName, content, onClose }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(fileName.replace(/\.md$/i, ''));
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'template' | 'snippet'>('template');
  const [location, setLocation] = useState<'global' | 'project'>('global');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { saveTemplate } = useTemplateStore();
  const { currentProject } = useProjectStore();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveTemplate(
        content,
        {
          name: name.trim(),
          category: category.trim() || undefined,
          type,
        },
        location,
        currentProject?.path
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-800">Save as Template</h3>
          </div>

          <div className="p-4 space-y-4">
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Template name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Template name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Template"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                disabled={isSaving}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., work, personal, meetings"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                disabled={isSaving}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="template"
                    checked={type === 'template'}
                    onChange={() => setType('template')}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-slate-700">New file template</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="snippet"
                    checked={type === 'snippet'}
                    onChange={() => setType('snippet')}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-slate-700">Snippet</span>
                </label>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="location"
                    value="global"
                    checked={location === 'global'}
                    onChange={() => setLocation('global')}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-slate-700">Global</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="location"
                    value="project"
                    checked={location === 'project'}
                    onChange={() => setLocation('project')}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isSaving || !currentProject}
                  />
                  <span className={`text-sm ${currentProject ? 'text-slate-700' : 'text-slate-400'}`}>
                    This project only
                  </span>
                </label>
              </div>
            </div>

            {/* Help text */}
            <p className="text-xs text-slate-500">
              Use <code className="bg-slate-100 px-1 py-0.5 rounded">{'{{title}}'}</code> and{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded">{'{{date}}'}</code> as placeholders.
            </p>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
