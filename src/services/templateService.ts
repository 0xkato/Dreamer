// Template types
export interface Template {
  id: string;
  name: string;
  category?: string;
  type: 'template' | 'snippet';
  content: string;
  location: 'global' | 'project';
  path: string;
}

export interface TemplateMetadata {
  name?: string;
  category?: string;
  type?: 'template' | 'snippet';
}

// Symbols for slash commands
export const SYMBOLS = [
  { command: 'check', symbol: '✓', description: 'Checkmark' },
  { command: 'x', symbol: '✗', description: 'X mark' },
  { command: 'warning', symbol: '⚠', description: 'Warning' },
  { command: 'info', symbol: 'ℹ', description: 'Information' },
  { command: 'star', symbol: '★', description: 'Star' },
  { command: 'arrow', symbol: '→', description: 'Arrow' },
  { command: 'bullet', symbol: '•', description: 'Bullet' },
  { command: 'priority', symbol: '⚡', description: 'Priority' },
] as const;

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// Parse YAML frontmatter from markdown content
function parseFrontmatter(content: string): { metadata: TemplateMetadata; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, yamlContent, body] = match;
  const metadata: TemplateMetadata = {};

  // Simple YAML parsing for our use case
  yamlContent.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === 'name') metadata.name = value;
    if (key === 'category') metadata.category = value;
    if (key === 'type' && (value === 'template' || value === 'snippet')) {
      metadata.type = value;
    }
  });

  return { metadata, body };
}

// Generate frontmatter from metadata
function generateFrontmatter(metadata: TemplateMetadata): string {
  const lines = ['---'];
  if (metadata.name) lines.push(`name: ${metadata.name}`);
  if (metadata.category) lines.push(`category: ${metadata.category}`);
  if (metadata.type) lines.push(`type: ${metadata.type}`);
  lines.push('---\n');
  return lines.join('\n');
}

// Replace placeholders in template content
export function replacePlaceholders(content: string, title: string): string {
  const today = new Date().toISOString().split('T')[0];
  return content
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{date\}\}/g, today);
}

// Load templates from a directory
async function loadTemplatesFromPath(
  basePath: string,
  location: 'global' | 'project'
): Promise<Template[]> {
  try {
    const response = await fetch(`${API_BASE}/api/templates?path=${encodeURIComponent(basePath)}`);
    if (!response.ok) return [];

    const files: { name: string; content: string }[] = await response.json();
    const templates: Template[] = [];

    for (const file of files) {
      if (!file.name.endsWith('.md')) continue;

      const { metadata, body } = parseFrontmatter(file.content);
      const fileName = file.name.replace(/\.md$/, '');

      templates.push({
        id: `${location}-${fileName}`,
        name: metadata.name || fileName,
        category: metadata.category,
        type: metadata.type || 'template',
        content: body,
        location,
        path: file.name,
      });
    }

    return templates;
  } catch {
    return [];
  }
}

// Load all templates (global + project)
export async function loadTemplates(projectPath?: string): Promise<Template[]> {
  const [globalTemplates, projectTemplates] = await Promise.all([
    loadTemplatesFromPath('global', 'global'),
    projectPath
      ? loadTemplatesFromPath(`${projectPath}/.templates`, 'project')
      : Promise.resolve([]),
  ]);

  // Project templates override global ones with same name
  const templateMap = new Map<string, Template>();

  for (const template of globalTemplates) {
    templateMap.set(template.name.toLowerCase(), template);
  }

  for (const template of projectTemplates) {
    templateMap.set(template.name.toLowerCase(), template);
  }

  return Array.from(templateMap.values());
}

// Save a file as a template
export async function saveAsTemplate(
  content: string,
  metadata: TemplateMetadata,
  location: 'global' | 'project',
  projectPath?: string
): Promise<void> {
  const frontmatter = generateFrontmatter(metadata);
  const { body } = parseFrontmatter(content);
  const fullContent = frontmatter + body;

  const fileName = `${metadata.name?.toLowerCase().replace(/\s+/g, '-') || 'untitled'}.md`;
  const basePath = location === 'global' ? 'global' : `${projectPath}/.templates`;

  const response = await fetch(`${API_BASE}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: basePath,
      fileName,
      content: fullContent,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save template');
  }
}

// Get template content with placeholders replaced
export function getTemplateContent(template: Template, title: string): string {
  return replacePlaceholders(template.content, title);
}
