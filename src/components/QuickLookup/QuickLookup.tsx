import { useState, useEffect, useRef, useMemo } from 'react';
import { useFileTreeStore, useProjectStore, useEditorStore } from '../../store';
import type { FileNode } from '../../types/project';

interface QuickLookupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickLookup({ isOpen, onClose }: QuickLookupProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { getAllFiles, nodes } = useFileTreeStore();
  const { currentProject } = useProjectStore();
  const { openFile } = useEditorStore();

  // Depend on nodes so we recalculate when file tree changes
  const allFiles = useMemo(() => getAllFiles(), [nodes, getAllFiles]);

  // Filter files based on query
  const filteredFiles = useMemo(() => {
    if (!query.trim()) return allFiles;

    const lowerQuery = query.toLowerCase();
    return allFiles.filter((file) => {
      // Match against file name and path
      const fileName = file.name.toLowerCase();
      const filePath = file.path.toLowerCase();
      return fileName.includes(lowerQuery) || filePath.includes(lowerQuery);
    }).sort((a, b) => {
      // Prioritize files where the query matches the start of the name
      const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  }, [allFiles, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          handleSelectFile(filteredFiles[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleSelectFile = async (file: FileNode) => {
    if (!currentProject) return;
    await openFile(currentProject.path, file.path, file.type as 'markdown' | 'canvas');
    onClose();
  };

  const getFileIcon = (type: string) => {
    if (type === 'markdown') {
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    // Canvas
    return (
      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          <kbd className="px-1.5 py-0.5 text-xs text-slate-500 bg-slate-100 rounded border border-slate-200">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-80 overflow-auto py-2">
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {query ? 'No files found' : 'No files in project'}
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <button
                key={file.id}
                onClick={() => handleSelectFile(file)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                  index === selectedIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${index === selectedIndex ? 'text-indigo-700 font-medium' : 'text-slate-700'}`}>
                    {file.name}
                  </div>
                  {file.path !== file.name && (
                    <div className="text-xs text-slate-400 truncate">
                      {file.path}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <kbd className="px-1.5 py-0.5 text-xs text-slate-500 bg-slate-100 rounded border border-slate-200">
                    enter
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white rounded border border-slate-200">↑</kbd>
            <kbd className="px-1 py-0.5 bg-white rounded border border-slate-200">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white rounded border border-slate-200">enter</kbd>
            open
          </span>
        </div>
      </div>
    </div>
  );
}
