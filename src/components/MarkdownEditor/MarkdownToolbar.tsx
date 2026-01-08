interface MarkdownToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onStrikethrough: () => void;
  onCode: () => void;
  onLink: () => void;
  onHeading: (level: number) => void;
  onBulletList: () => void;
  onNumberedList: () => void;
  onCodeBlock: () => void;
  onQuote: () => void;
  onTogglePreview: () => void;
  onInsertSymbol: (symbol: string) => void;
  onOpenSymbolMenu: () => void;
  showPreview: boolean;
  isDirty: boolean;
  fileName: string;
}

export function MarkdownToolbar({
  onBold,
  onItalic,
  onStrikethrough,
  onCode,
  onLink,
  onHeading,
  onBulletList,
  onNumberedList,
  onCodeBlock,
  onQuote,
  onTogglePreview,
  onInsertSymbol,
  onOpenSymbolMenu,
  showPreview,
  isDirty,
  fileName,
}: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
      {/* File name and dirty indicator */}
      <div className="flex items-center gap-2 mr-3">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm text-slate-700">{fileName}</span>
        {isDirty && (
          <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
        )}
      </div>

      <div className="h-5 w-px bg-slate-300 mx-1" />

      {/* Heading dropdown */}
      <div className="relative group">
        <button className="toolbar-btn" title="Heading">
          <span className="text-xs font-bold">H</span>
          <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <button
              key={level}
              onClick={() => onHeading(level)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
            >
              <span style={{ fontSize: `${1.4 - level * 0.15}rem` }} className="font-bold">
                H{level}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={onBold} className="toolbar-btn" title="Bold (Cmd+B)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z" />
        </svg>
      </button>

      <button onClick={onItalic} className="toolbar-btn" title="Italic (Cmd+I)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
        </svg>
      </button>

      <button onClick={onStrikethrough} className="toolbar-btn" title="Strikethrough">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M7 6h10a2 2 0 0 1 0 4M9 14h6a2 2 0 0 1 0 4H7" />
        </svg>
      </button>

      <div className="h-5 w-px bg-slate-300 mx-1" />

      <button onClick={onBulletList} className="toolbar-btn" title="Bullet List">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" />
        </svg>
      </button>

      <button onClick={onNumberedList} className="toolbar-btn" title="Numbered List">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" />
          <text x="2" y="8" fontSize="6" fill="currentColor">1</text>
          <text x="2" y="14" fontSize="6" fill="currentColor">2</text>
          <text x="2" y="20" fontSize="6" fill="currentColor">3</text>
        </svg>
      </button>

      <button onClick={onQuote} className="toolbar-btn" title="Quote">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <div className="h-5 w-px bg-slate-300 mx-1" />

      <button onClick={onCode} className="toolbar-btn" title="Inline Code">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      <button onClick={onCodeBlock} className="toolbar-btn" title="Code Block">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      <button onClick={onLink} className="toolbar-btn" title="Link">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>

      <div className="h-5 w-px bg-slate-300 mx-1" />

      {/* Symbol buttons */}
      <button
        onClick={() => onInsertSymbol('✓')}
        className="toolbar-btn"
        title="Checkmark - type /check"
      >
        <span className="text-sm">✓</span>
      </button>
      <button
        onClick={() => onInsertSymbol('✗')}
        className="toolbar-btn"
        title="X mark - type /x"
      >
        <span className="text-sm">✗</span>
      </button>
      <button
        onClick={() => onInsertSymbol('⚠')}
        className="toolbar-btn"
        title="Warning - type /warning"
      >
        <span className="text-sm">⚠</span>
      </button>
      <button
        onClick={() => onInsertSymbol('→')}
        className="toolbar-btn"
        title="Arrow - type /arrow"
      >
        <span className="text-sm">→</span>
      </button>
      <button
        onClick={onOpenSymbolMenu}
        className="toolbar-btn"
        title="More symbols - type /"
      >
        <span className="text-sm">⋯</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Preview toggle */}
      <button
        onClick={onTogglePreview}
        className={`toolbar-btn ${showPreview ? 'bg-indigo-100 text-indigo-700' : ''}`}
        title="Toggle Preview"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    </div>
  );
}
