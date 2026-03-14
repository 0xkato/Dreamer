import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownPreview } from './MarkdownPreview';
import { SlashCommandMenu } from './SlashCommandMenu';
import { BacklinksPanel } from './BacklinksPanel';
import { useProjectStore } from '../../store';
import { uploadImage } from '../../services/fileSystem';
import type { OpenFile, MarkdownContent } from '../../types/project';

interface MarkdownEditorProps {
  file: OpenFile;
  onContentChange: (text: string) => void;
  onSave: () => void;
  onOpenLink?: (name: string) => void;
}

interface SlashMenuState {
  open: boolean;
  position: { x: number; y: number };
  filter: string;
  slashPos: number; // Position of the `/` in the document
}

export function MarkdownEditor({ file, onContentChange, onSave, onOpenLink }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const theme = useProjectStore((s) => s.settings.theme);
  const currentProject = useProjectStore((s) => s.currentProject);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    open: false,
    position: { x: 0, y: 0 },
    filter: '',
    slashPos: 0,
  });

  const content = (file.content as MarkdownContent).text;

  // Refs to avoid stale closures in CodeMirror's updateListener
  const handleChangeRef = useRef<(text: string, view: EditorView) => void>(() => {});

  // Get cursor screen position
  const getCursorPosition = useCallback(() => {
    const view = viewRef.current;
    if (!view) return { x: 0, y: 0 };

    const pos = view.state.selection.main.head;
    const coords = view.coordsAtPos(pos);
    if (!coords) return { x: 0, y: 0 };

    return { x: coords.left, y: coords.bottom + 4 };
  }, []);

  // Handle content changes and slash command detection
  const handleChange = useCallback((text: string, view: EditorView) => {
    onContentChange(text);

    // Check for slash command
    const pos = view.state.selection.main.head;
    const lineStart = view.state.doc.lineAt(pos).from;
    const textBeforeCursor = text.slice(lineStart, pos);

    // Look for `/` followed by optional filter text
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);

    if (slashMatch) {
      const slashPos = lineStart + textBeforeCursor.lastIndexOf('/');
      const filter = slashMatch[1] || '';
      const coords = getCursorPosition();

      setSlashMenu({
        open: true,
        position: coords,
        filter,
        slashPos,
      });
    } else if (slashMenu.open) {
      setSlashMenu((prev) => ({ ...prev, open: false }));
    }
  }, [onContentChange, getCursorPosition, slashMenu.open]);

  // Keep ref in sync so the CodeMirror closure always calls the latest version
  handleChangeRef.current = handleChange;

  // Handle slash menu selection
  const handleSlashSelect = useCallback((insertText: string) => {
    const view = viewRef.current;
    if (!view) return;

    // Replace from slash position to current cursor
    const cursorPos = view.state.selection.main.head;

    view.dispatch({
      changes: {
        from: slashMenu.slashPos,
        to: cursorPos,
        insert: insertText,
      },
    });

    setSlashMenu((prev) => ({ ...prev, open: false }));
    view.focus();
  }, [slashMenu.slashPos]);

  // Close slash menu
  const closeSlashMenu = useCallback(() => {
    setSlashMenu((prev) => ({ ...prev, open: false }));
    viewRef.current?.focus();
  }, []);

  // Handle image upload (shared by drag-drop and paste)
  const handleImageUpload = useCallback(async (imageFile: File) => {
    const projectPath = currentProject?.path;
    if (!projectPath) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const imagePath = await uploadImage(projectPath, imageFile.name, base64);

        const view = viewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        const imageMarkdown = `![${imageFile.name}](${imagePath})`;
        view.dispatch({
          changes: { from: pos, to: pos, insert: imageMarkdown },
          selection: { anchor: pos + imageMarkdown.length },
        });
      } catch (err) {
        console.error('Failed to upload image:', err);
      }
    };
    reader.readAsDataURL(imageFile);
  }, [currentProject?.path]);

  // Use a ref so the CodeMirror paste handler always gets the latest function
  const handleImageUploadRef = useRef(handleImageUpload);
  handleImageUploadRef.current = handleImageUpload;

  // Handle drop on editor
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFile = files[0];
    if (!imageFile.type.startsWith('image/')) return;

    e.preventDefault();
    e.stopPropagation();

    handleImageUpload(imageFile);
  }, [handleImageUpload]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
    }
  }, []);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Custom theme for light mode
    const lightTheme = EditorView.theme({
      '&': {
        fontSize: '14px',
        height: '100%',
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        padding: '16px',
      },
      '.cm-gutters': {
        backgroundColor: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        color: '#94a3b8',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f1f5f9',
      },
      '.cm-activeLine': {
        backgroundColor: '#f8fafc',
      },
      '.cm-cursor': {
        borderLeftColor: '#6366f1',
      },
      '.cm-selectionBackground': {
        backgroundColor: '#c7d2fe !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#c7d2fe !important',
      },
    });

    // Custom theme for dark mode
    const darkTheme = EditorView.theme({
      '&': {
        fontSize: '14px',
        height: '100%',
        backgroundColor: '#1e293b',
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        padding: '16px',
        color: '#e2e8f0',
      },
      '.cm-gutters': {
        backgroundColor: '#0f172a',
        borderRight: '1px solid #334155',
        color: '#64748b',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1e293b',
      },
      '.cm-activeLine': {
        backgroundColor: '#1e293b',
      },
      '.cm-cursor': {
        borderLeftColor: '#818cf8',
      },
      '.cm-selectionBackground': {
        backgroundColor: '#312e81 !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#312e81 !important',
      },
    }, { dark: true });

    const editorTheme = theme === 'dark' ? darkTheme : lightTheme;

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Mod-s',
            run: () => {
              onSave();
              return true;
            },
          },
        ]),
        editorTheme,
        placeholder('Start writing...'),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged || update.selectionSet) {
            handleChangeRef.current(update.state.doc.toString(), update.view);
          }
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const pastedFile = item.getAsFile();
                if (pastedFile) {
                  handleImageUploadRef.current(pastedFile);
                }
                return true;
              }
            }
            return false;
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme]); // Reinitialize when theme changes

  // Update editor content when file changes (e.g., switching files)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      });
    }
  }, [file.path]); // Only when file path changes

  // Toolbar actions
  const insertText = (before: string, after: string = '') => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    view.dispatch({
      changes: {
        from,
        to,
        insert: `${before}${selectedText}${after}`,
      },
      selection: {
        anchor: from + before.length,
        head: from + before.length + selectedText.length,
      },
    });
    view.focus();
  };

  // Insert symbol at cursor
  const handleInsertSymbol = (symbol: string) => {
    const view = viewRef.current;
    if (!view) return;

    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: symbol },
      selection: { anchor: pos + symbol.length },
    });
    view.focus();
  };

  // Open symbol menu from toolbar
  const handleOpenSymbolMenu = () => {
    const view = viewRef.current;
    if (!view) return;

    const pos = view.state.selection.main.head;
    const coords = getCursorPosition();

    // Insert a `/` to trigger the menu
    view.dispatch({
      changes: { from: pos, to: pos, insert: '/' },
      selection: { anchor: pos + 1 },
    });

    setSlashMenu({
      open: true,
      position: coords,
      filter: '',
      slashPos: pos,
    });
  };

  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('_', '_');
  const handleStrikethrough = () => insertText('~~', '~~');
  const handleCode = () => insertText('`', '`');
  const handleLink = () => insertText('[', '](url)');
  const handleHeading = (level: number) => {
    const view = viewRef.current;
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const prefix = '#'.repeat(level) + ' ';

    // Remove existing heading prefix if present
    const existingMatch = line.text.match(/^#+\s*/);
    const removeLength = existingMatch ? existingMatch[0].length : 0;

    view.dispatch({
      changes: {
        from: line.from,
        to: line.from + removeLength,
        insert: prefix,
      },
    });
    view.focus();
  };
  const handleBulletList = () => {
    const view = viewRef.current;
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);

    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: '- ',
      },
    });
    view.focus();
  };
  const handleNumberedList = () => {
    const view = viewRef.current;
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);

    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: '1. ',
      },
    });
    view.focus();
  };
  const handleInsertTable = () => {
    const view = viewRef.current;
    if (!view) return;

    const pos = view.state.selection.main.head;
    const table = `\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n`;

    view.dispatch({
      changes: { from: pos, to: pos, insert: table },
      selection: { anchor: pos + table.length },
    });
    view.focus();
  };

  const handleCodeBlock = () => insertText('\n```\n', '\n```\n');
  const handleQuote = () => {
    const view = viewRef.current;
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);

    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: '> ',
      },
    });
    view.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Toolbar */}
      <MarkdownToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onStrikethrough={handleStrikethrough}
        onCode={handleCode}
        onLink={handleLink}
        onHeading={handleHeading}
        onBulletList={handleBulletList}
        onNumberedList={handleNumberedList}
        onCodeBlock={handleCodeBlock}
        onQuote={handleQuote}
        onInsertTable={handleInsertTable}
        onTogglePreview={() => setShowPreview(!showPreview)}
        onInsertSymbol={handleInsertSymbol}
        onOpenSymbolMenu={handleOpenSymbolMenu}
        showPreview={showPreview}
        isDirty={file.isDirty}
        fileName={file.name}
      />

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Editor */}
        <div
          ref={editorRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`h-full overflow-auto ${showPreview ? 'w-1/2 border-r border-slate-200 dark:border-slate-700' : 'w-full'}`}
        />

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 h-full overflow-auto">
            <MarkdownPreview content={content} projectPath={currentProject?.path} onWikiLinkClick={onOpenLink} />
          </div>
        )}

        {/* Slash command menu */}
        {slashMenu.open && (
          <SlashCommandMenu
            position={slashMenu.position}
            filter={slashMenu.filter}
            onSelect={handleSlashSelect}
            onClose={closeSlashMenu}
          />
        )}
      </div>

      {/* Backlinks panel */}
      {currentProject?.path && file.path && (
        <BacklinksPanel
          projectPath={currentProject.path}
          currentFile={file.path}
          onOpenFile={(path) => onOpenLink?.(path)}
        />
      )}
    </div>
  );
}
