import { useState, useRef, useEffect } from 'react';
import { useFileTreeStore, useEditorStore, useProjectStore } from '../../store';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const { createFolder, createFile } = useFileTreeStore();
  const { openFile } = useEditorStore();
  const { currentProject } = useProjectStore();

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
