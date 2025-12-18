import { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownPreviewProps {
  content: string;
}

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return '<p>Error rendering markdown</p>';
    }
  }, [content]);

  return (
    <div className="h-full overflow-auto bg-white">
      <div
        className="prose prose-slate max-w-none p-6 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 prose-a:text-indigo-600 prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
