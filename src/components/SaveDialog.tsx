import { useState, useEffect } from 'react';
import { saveDiagram, getSavedDiagrams } from '../utils/storage';
import { useCanvasStore, useElementsStore } from '../store';
import type { DiagramFile } from '../types';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isNewWhiteboard?: boolean;
}

export function SaveDialog({ isOpen, onClose, isNewWhiteboard = false }: SaveDialogProps) {
  const [name, setName] = useState('');
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  const { viewport, resetViewport } = useCanvasStore();
  const { elements, connectors, setCurrentDiagram, reset } = useElementsStore();

  // Load existing names when dialog opens
  useEffect(() => {
    if (isOpen) {
      const diagrams = getSavedDiagrams();
      setExistingNames(diagrams.map(d => d.name));
      setName('');
      setShowOverwriteWarning(false);
    }
  }, [isOpen]);

  // Check for duplicate names
  useEffect(() => {
    setShowOverwriteWarning(existingNames.includes(name.trim()));
  }, [name, existingNames]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    if (isNewWhiteboard) {
      // Creating a new whiteboard - completely fresh and empty
      const emptyDiagram: DiagramFile = {
        version: '1.0.0',
        metadata: {
          name: name.trim(),
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport: { panX: 0, panY: 0, zoom: 1 },
        elements: [],
        connectors: [],
      };

      const saved = saveDiagram(name.trim(), emptyDiagram);

      // Reset canvas to empty state
      reset();
      resetViewport();

      // Set this as the current diagram
      setCurrentDiagram(saved.id, saved.name);
    } else {
      // Saving current content
      const diagram: DiagramFile = {
        version: '1.0.0',
        metadata: {
          name: name.trim(),
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport,
        elements,
        connectors,
      };

      const saved = saveDiagram(name.trim(), diagram);
      setCurrentDiagram(saved.id, saved.name);
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            {isNewWhiteboard ? 'Create New Whiteboard' : 'Save Diagram'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isNewWhiteboard ? 'Give your new whiteboard a name' : 'Give your diagram a name'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Diagram Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="My Diagram"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autoFocus
          />

          {showOverwriteWarning && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              A diagram with this name already exists and will be overwritten
            </p>
          )}

          {/* Recent names suggestion */}
          {existingNames.length > 0 && !name && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Recent diagrams:</p>
              <div className="flex flex-wrap gap-1">
                {existingNames.slice(0, 5).map((existingName) => (
                  <button
                    key={existingName}
                    onClick={() => setName(existingName)}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                  >
                    {existingName}
                  </button>
                ))}
              </div>
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
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNewWhiteboard ? 'Create' : (showOverwriteWarning ? 'Overwrite' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
