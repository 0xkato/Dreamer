import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../../store';
import { searchProjectFiles, type SearchResult } from '../../services/fileSystem';

interface SearchPanelProps {
  onClose: () => void;
  onOpenFile: (relativePath: string) => void;
}

export function SearchPanel({ onClose, onOpenFile }: SearchPanelProps) {
  const { currentProject } = useProjectStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autofocus the input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!currentProject || !searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchProjectFiles(currentProject.path, searchQuery.trim());
      setResults(data);
      setHasSearched(true);
    } catch {
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Search</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Close search (Esc)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in files..."
          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {query.trim() && !isLoading && hasSearched && (
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {totalMatches} {totalMatches === 1 ? 'result' : 'results'} in {results.length} {results.length === 1 ? 'file' : 'files'}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">No results found</span>
          </div>
        )}

        {!isLoading && results.map((result, resultIndex) => (
          <div key={resultIndex} className="border-b border-slate-100 dark:border-slate-700/50">
            {/* File header */}
            <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 truncate" title={result.file}>
              {result.file}
            </div>
            {/* Matches */}
            {result.matches.map((match, matchIndex) => (
              <button
                key={matchIndex}
                onClick={() => onOpenFile(result.file)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 pt-0.5 min-w-[2rem] text-right">
                    {match.line}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    <HighlightedText text={match.text} query={query} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts: Array<{ text: string; highlight: boolean }> = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  let lastIndex = 0;

  let searchFrom = 0;
  while (searchFrom < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, searchFrom);
    if (index === -1) break;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), highlight: false });
    }
    parts.push({ text: text.slice(index, index + lowerQuery.length), highlight: true });
    lastIndex = index + lowerQuery.length;
    searchFrom = lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className="bg-amber-200 dark:bg-amber-700/60 text-amber-900 dark:text-amber-100 rounded-sm px-0.5">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
