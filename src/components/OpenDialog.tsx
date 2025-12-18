import { useState, useEffect } from 'react';
import { getSavedDiagrams, loadDiagram, deleteDiagram, renameDiagram, type SavedDiagram } from '../utils/storage';
import { useCanvasStore, useElementsStore } from '../store';

interface OpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNeedCreate: () => void;
}

export function OpenDialog({ isOpen, onClose, onNeedCreate }: OpenDialogProps) {
  const [diagrams, setDiagrams] = useState<SavedDiagram[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { loadDiagram: loadDiagramToCanvas, setCurrentDiagram, clearCurrentDiagram, reset, currentDiagramId } = useElementsStore();
  const { setViewport, resetViewport } = useCanvasStore();

  // Load diagrams when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDiagrams(getSavedDiagrams());
      setSelectedId(null);
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoad = () => {
    if (!selectedId) return;

    const diagram = loadDiagram(selectedId);
    if (diagram) {
      loadDiagramToCanvas(diagram.data.elements, diagram.data.connectors);
      setViewport(diagram.data.viewport);
      // Set this as the current diagram
      setCurrentDiagram(diagram.id, diagram.name);
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this diagram?')) {
      deleteDiagram(id);
      const remaining = getSavedDiagrams();
      setDiagrams(remaining);

      if (selectedId === id) {
        setSelectedId(null);
      }

      // If we deleted the current diagram, always prompt for action
      if (currentDiagramId === id) {
        clearCurrentDiagram();
        reset();
        resetViewport();

        // Always prompt to create new (they can use Open to select existing)
        onClose();
        onNeedCreate();
      } else if (remaining.length === 0) {
        // No diagrams left at all
        onClose();
        onNeedCreate();
      }
    }
  };

  const handleStartRename = (diagram: SavedDiagram) => {
    setEditingId(diagram.id);
    setEditName(diagram.name);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameDiagram(id, editName.trim());
      setDiagrams(getSavedDiagrams());
    }
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Open Diagram</h2>
          <p className="text-sm text-slate-500 mt-0.5">Select a saved diagram to open</p>
        </div>

        {/* Content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {diagrams.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-sm">No saved diagrams yet</p>
              <p className="text-xs text-slate-400 mt-1">Create a diagram and save it to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {diagrams.map((diagram) => (
                <div
                  key={diagram.id}
                  className={`group p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedId === diagram.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedId(diagram.id)}
                  onDoubleClick={handleLoad}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingId === diagram.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(diagram.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(diagram.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full px-2 py-1 text-sm font-medium border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium text-slate-800 truncate">{diagram.name}</h3>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Modified {formatDate(diagram.updatedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(diagram);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                        title="Rename"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(diagram.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedId}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
