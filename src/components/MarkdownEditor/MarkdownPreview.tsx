import { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getImageUrl } from '../../services/fileSystem';

interface MarkdownPreviewProps {
  content: string;
  projectPath?: string;
  onWikiLinkClick?: (name: string) => void;
}

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function MarkdownPreview({ content, projectPath, onWikiLinkClick }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      let parsed = marked.parse(content) as string;

      // Transform relative image paths to use the API endpoint
      if (projectPath) {
        parsed = parsed.replace(
          /<img\s+src="(?!https?:\/\/|data:)([^"]+)"/g,
          (_match, imagePath) => {
            const apiUrl = getImageUrl(projectPath, imagePath);
            return `<img src="${apiUrl}"`;
          }
        );
      }

      // Transform ![[file.canvas]] into embed cards (before wiki-link transform)
      parsed = parsed.replace(
        /!\[\[([^\]]+\.canvas)\]\]/g,
        `<div class="canvas-embed-card" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 8px 0; display: flex; align-items: center; gap: 8px; cursor: pointer;" data-canvas-file="$1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          <span style="color: #6366f1; font-weight: 500;">$1</span>
          <span style="color: #94a3b8; font-size: 12px; margin-left: auto;">Canvas diagram</span>
        </div>`
      );

      // Transform [[wiki links]] into clickable links
      parsed = parsed.replace(
        /\[\[([^\]]+)\]\]/g,
        '<a href="#" class="wiki-link text-indigo-600 dark:text-indigo-400 hover:underline" data-wiki-link="$1">$1</a>'
      );

      return DOMPurify.sanitize(parsed, {
        ADD_ATTR: ['data-wiki-link', 'data-canvas-file'],
        ADD_TAGS: ['svg', 'line', 'rect', 'path'],
      });
    } catch {
      return '<p>Error rendering markdown</p>';
    }
  }, [content, projectPath]);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Handle canvas embed card clicks
    const embedCard = target.closest('.canvas-embed-card') as HTMLElement | null;
    if (embedCard) {
      e.preventDefault();
      const canvasFile = embedCard.getAttribute('data-canvas-file');
      if (canvasFile && onWikiLinkClick) {
        onWikiLinkClick(canvasFile);
      }
      return;
    }

    if (target.classList.contains('wiki-link')) {
      e.preventDefault();
      const linkTarget = target.getAttribute('data-wiki-link');
      if (linkTarget && onWikiLinkClick) {
        onWikiLinkClick(linkTarget);
      }
    }
  }, [onWikiLinkClick]);

  return (
    <div className="h-full overflow-auto bg-white dark:bg-slate-800">
      <div
        className="prose prose-slate dark:prose-invert max-w-none p-6 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handlePreviewClick}
      />
    </div>
  );
}
