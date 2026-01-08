import { useEffect, useRef, useState } from 'react';
import { useTemplateStore } from '../../store';
import { SYMBOLS } from '../../services/templateService';
import type { Template } from '../../services/templateService';

interface SlashCommandMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (text: string) => void;
  onClose: () => void;
}

type MenuItem =
  | { type: 'symbol'; item: typeof SYMBOLS[number] }
  | { type: 'snippet'; item: Template };

export function SlashCommandMenu({ position, filter, onSelect, onClose }: SlashCommandMenuProps) {
  const { templates } = useTemplateStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Get filtered items
  const items: MenuItem[] = [];

  // Add matching symbols
  for (const symbol of SYMBOLS) {
    if (
      filter === '' ||
      symbol.command.toLowerCase().includes(filter.toLowerCase()) ||
      symbol.description.toLowerCase().includes(filter.toLowerCase())
    ) {
      items.push({ type: 'symbol', item: symbol });
    }
  }

  // Add matching snippets
  for (const template of templates) {
    if (template.type !== 'snippet') continue;
    if (
      filter === '' ||
      template.name.toLowerCase().includes(filter.toLowerCase()) ||
      template.category?.toLowerCase().includes(filter.toLowerCase())
    ) {
      items.push({ type: 'snippet', item: template });
    }
  }

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex]) {
            handleSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSelect = (menuItem: MenuItem) => {
    if (menuItem.type === 'symbol') {
      onSelect(menuItem.item.symbol);
    } else {
      onSelect(menuItem.item.content);
    }
  };

  if (items.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-2 px-3 text-sm text-slate-500 z-50"
        style={{ left: position.x, top: position.y }}
      >
        No matches found
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-64 overflow-y-auto min-w-48"
      style={{ left: position.x, top: position.y }}
    >
      {/* Symbols section */}
      {items.some((i) => i.type === 'symbol') && (
        <>
          <div className="px-3 py-1 text-xs font-medium text-slate-400 uppercase">Symbols</div>
          {items.map((menuItem, index) => {
            if (menuItem.type !== 'symbol') return null;
            const isSelected = index === selectedIndex;
            return (
              <button
                key={menuItem.item.command}
                ref={isSelected ? selectedRef : null}
                onClick={() => handleSelect(menuItem)}
                className={`w-full px-3 py-1.5 flex items-center gap-3 text-left text-sm ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-lg w-6 text-center">{menuItem.item.symbol}</span>
                <span>{menuItem.item.description}</span>
                <span className="ml-auto text-xs text-slate-400">/{menuItem.item.command}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Snippets section */}
      {items.some((i) => i.type === 'snippet') && (
        <>
          <div className="px-3 py-1 text-xs font-medium text-slate-400 uppercase mt-1">Snippets</div>
          {items.map((menuItem, index) => {
            if (menuItem.type !== 'snippet') return null;
            const isSelected = index === selectedIndex;
            return (
              <button
                key={menuItem.item.id}
                ref={isSelected ? selectedRef : null}
                onClick={() => handleSelect(menuItem)}
                className={`w-full px-3 py-1.5 flex items-center gap-3 text-left text-sm ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-lg w-6 text-center">📄</span>
                <span>{menuItem.item.name}</span>
                {menuItem.item.category && (
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {menuItem.item.category}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
