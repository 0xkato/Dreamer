import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Data directory for storing app data (settings, recent projects, etc.)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(__dirname, 'projects');

// Ensure directories exist
await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(PROJECTS_BASE, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../dist')));

// Constants
const SETTINGS_FILE = 'settings.json';
const PROJECT_FILE = 'dreamer.project.json';
const CALENDAR_FILE = 'calendar.json';
const CANVAS_VERSION = '2.0.0';
const PROJECT_VERSION = '1.0.0';
const CALENDAR_VERSION = '1.0.0';

// Default settings
const DEFAULT_APP_SETTINGS = {
  recentProjects: [],
  theme: 'light',
  autoSave: true,
  autoSaveInterval: 30000,
};

const DEFAULT_PROJECT_SETTINGS = {
  defaultView: 'tree',
  sortOrder: 'name',
};

// Helper to get file type from extension
function getFileType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'canvas') return 'canvas';
  return 'folder';
}

// ============================================
// App Settings Endpoints
// ============================================

app.get('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(DATA_DIR, SETTINGS_FILE);
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      res.json({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(content) });
    } catch {
      res.json({ ...DEFAULT_APP_SETTINGS });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settingsPath = path.join(DATA_DIR, SETTINGS_FILE);
    await fs.writeFile(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Project Endpoints
// ============================================

// List all projects in the projects directory
app.get('/api/projects', async (req, res) => {
  try {
    const entries = await fs.readdir(PROJECTS_BASE, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectFilePath = path.join(PROJECTS_BASE, entry.name, PROJECT_FILE);
        try {
          const content = await fs.readFile(projectFilePath, 'utf-8');
          const projectFile = JSON.parse(content);
          projects.push({
            id: uuidv4(),
            name: projectFile.name,
            path: path.join(PROJECTS_BASE, entry.name),
            createdAt: projectFile.created,
            lastOpenedAt: new Date().toISOString(),
          });
        } catch {
          // Not a valid project directory, skip
        }
      }
    }

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    const projectFolderPath = path.join(PROJECTS_BASE, name);

    try {
      await fs.access(projectFolderPath);
      return res.status(400).json({ error: `A project named "${name}" already exists` });
    } catch {
      // Directory doesn't exist, which is what we want
    }

    await fs.mkdir(projectFolderPath, { recursive: true });

    const projectFilePath = path.join(projectFolderPath, PROJECT_FILE);
    const now = new Date().toISOString();

    const projectFile = {
      version: PROJECT_VERSION,
      name,
      created: now,
      settings: { ...DEFAULT_PROJECT_SETTINGS },
    };

    await fs.writeFile(projectFilePath, JSON.stringify(projectFile, null, 2));

    const project = {
      id: uuidv4(),
      name,
      path: projectFolderPath,
      createdAt: now,
      lastOpenedAt: now,
    };

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open a project
app.get('/api/projects/:projectName', async (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_BASE, req.params.projectName);
    const projectFilePath = path.join(projectPath, PROJECT_FILE);

    try {
      await fs.access(projectFilePath);
    } catch {
      return res.status(404).json({ error: 'Project not found' });
    }

    const content = await fs.readFile(projectFilePath, 'utf-8');
    const projectFile = JSON.parse(content);

    const project = {
      id: uuidv4(),
      name: projectFile.name,
      path: projectPath,
      createdAt: projectFile.created,
      lastOpenedAt: new Date().toISOString(),
    };

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// File Tree Endpoints
// ============================================

// Read directory tree
app.get('/api/files', async (req, res) => {
  try {
    const { projectPath, relativePath = '' } = req.query;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const absolutePath = relativePath
      ? path.join(projectPath, relativePath)
      : projectPath;

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const nodes = [];

    for (const entry of entries) {
      // Skip hidden files and project metadata
      if (entry.name.startsWith('.') || entry.name === PROJECT_FILE || entry.name === CALENDAR_FILE) continue;

      const entryRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;
      const entryAbsolutePath = path.join(projectPath, entryRelativePath);

      if (entry.isDirectory()) {
        // Recursively read children
        const childResponse = await readDirectoryTree(projectPath, entryRelativePath);
        nodes.push({
          id: uuidv4(),
          name: entry.name,
          type: 'folder',
          path: entryRelativePath,
          absolutePath: entryAbsolutePath,
          parentPath: relativePath || null,
          children: childResponse,
        });
      } else {
        const fileType = getFileType(entry.name);
        // Only include markdown and canvas files
        if (fileType === 'markdown' || fileType === 'canvas') {
          nodes.push({
            id: uuidv4(),
            name: entry.name,
            type: fileType,
            path: entryRelativePath,
            absolutePath: entryAbsolutePath,
            parentPath: relativePath || null,
          });
        }
      }
    }

    // Sort: folders first, then alphabetically
    nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function for recursive directory reading
async function readDirectoryTree(projectPath, relativePath = '') {
  const absolutePath = relativePath
    ? path.join(projectPath, relativePath)
    : projectPath;

  let entries;
  try {
    entries = await fs.readdir(absolutePath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === PROJECT_FILE || entry.name === CALENDAR_FILE) continue;

    const entryRelativePath = relativePath
      ? path.join(relativePath, entry.name)
      : entry.name;
    const entryAbsolutePath = path.join(projectPath, entryRelativePath);

    if (entry.isDirectory()) {
      const children = await readDirectoryTree(projectPath, entryRelativePath);
      nodes.push({
        id: uuidv4(),
        name: entry.name,
        type: 'folder',
        path: entryRelativePath,
        absolutePath: entryAbsolutePath,
        parentPath: relativePath || null,
        children,
      });
    } else {
      const fileType = getFileType(entry.name);
      if (fileType === 'markdown' || fileType === 'canvas') {
        nodes.push({
          id: uuidv4(),
          name: entry.name,
          type: fileType,
          path: entryRelativePath,
          absolutePath: entryAbsolutePath,
          parentPath: relativePath || null,
        });
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { projectPath, relativePath } = req.body;
    const absolutePath = path.join(projectPath, relativePath);
    await fs.mkdir(absolutePath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create file
app.post('/api/files', async (req, res) => {
  try {
    const { projectPath, relativePath, type } = req.body;

    // Add extension if not present
    let filePath = relativePath;
    const ext = type === 'markdown' ? '.md' : '.canvas';
    if (!filePath.toLowerCase().endsWith(ext)) {
      filePath += ext;
    }

    const absolutePath = path.join(projectPath, filePath);

    // Check if file already exists
    try {
      await fs.access(absolutePath);
      return res.status(400).json({ error: 'File already exists' });
    } catch {
      // File doesn't exist, which is what we want
    }

    // Create with default content
    if (type === 'markdown') {
      const fileName = path.basename(filePath);
      const title = fileName.replace(/\.md$/i, '');
      await fs.writeFile(absolutePath, `# ${title}\n\n`);
    } else {
      const canvasFile = {
        version: CANVAS_VERSION,
        type: 'canvas',
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport: { panX: 0, panY: 0, zoom: 1 },
        elements: [],
        connectors: [],
      };
      await fs.writeFile(absolutePath, JSON.stringify(canvasFile, null, 2));
    }

    res.json({ path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file or folder
app.delete('/api/files', async (req, res) => {
  try {
    const { absolutePath } = req.body;
    await fs.rm(absolutePath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename file or folder
app.patch('/api/files/rename', async (req, res) => {
  try {
    const { oldAbsolutePath, newName } = req.body;
    const parentDir = path.dirname(oldAbsolutePath);
    const newAbsolutePath = path.join(parentDir, newName);

    try {
      await fs.access(newAbsolutePath);
      return res.status(400).json({ error: 'A file or folder with that name already exists' });
    } catch {
      // Doesn't exist, good
    }

    await fs.rename(oldAbsolutePath, newAbsolutePath);
    res.json({ newPath: newAbsolutePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move file or folder
app.patch('/api/files/move', async (req, res) => {
  try {
    const { sourceAbsolutePath, destFolderAbsolutePath } = req.body;
    const fileName = path.basename(sourceAbsolutePath);
    const destAbsolutePath = path.join(destFolderAbsolutePath, fileName);

    try {
      await fs.access(destAbsolutePath);
      return res.status(400).json({ error: 'A file or folder with that name already exists in the destination' });
    } catch {
      // Doesn't exist, good
    }

    await fs.rename(sourceAbsolutePath, destAbsolutePath);
    res.json({ newPath: destAbsolutePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// File Content Endpoints
// ============================================

// Read markdown file
app.get('/api/content/markdown', async (req, res) => {
  try {
    const { absolutePath } = req.query;
    const content = await fs.readFile(absolutePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write markdown file
app.post('/api/content/markdown', async (req, res) => {
  try {
    const { absolutePath, content } = req.body;
    await fs.writeFile(absolutePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read canvas file
app.get('/api/content/canvas', async (req, res) => {
  try {
    const { absolutePath } = req.query;
    const content = await fs.readFile(absolutePath, 'utf-8');
    const canvasFile = JSON.parse(content);

    res.json({
      type: 'canvas',
      elements: canvasFile.elements || [],
      connectors: canvasFile.connectors || [],
      viewport: canvasFile.viewport || { panX: 0, panY: 0, zoom: 1 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write canvas file
app.post('/api/content/canvas', async (req, res) => {
  try {
    const { absolutePath, content } = req.body;

    // Read existing file to preserve metadata if possible
    let existingMetadata = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    try {
      const existing = await fs.readFile(absolutePath, 'utf-8');
      const parsed = JSON.parse(existing);
      existingMetadata.created = parsed.metadata?.created || existingMetadata.created;
    } catch {
      // Ignore errors, use defaults
    }

    const canvasFile = {
      version: CANVAS_VERSION,
      type: 'canvas',
      metadata: {
        created: existingMetadata.created,
        modified: new Date().toISOString(),
      },
      viewport: content.viewport,
      elements: content.elements,
      connectors: content.connectors,
    };

    await fs.writeFile(absolutePath, JSON.stringify(canvasFile, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Calendar Endpoints
// ============================================

// Read calendar
app.get('/api/calendar', async (req, res) => {
  try {
    const { projectPath } = req.query;
    const calendarPath = path.join(projectPath, CALENDAR_FILE);

    try {
      const content = await fs.readFile(calendarPath, 'utf-8');
      const data = JSON.parse(content);
      res.json({
        ...data,
        todos: data.todos || [],
      });
    } catch {
      // Return empty calendar if file doesn't exist
      res.json({
        version: CALENDAR_VERSION,
        events: [],
        todos: [],
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write calendar
app.post('/api/calendar', async (req, res) => {
  try {
    const { projectPath, data } = req.body;
    const calendarPath = path.join(projectPath, CALENDAR_FILE);
    await fs.writeFile(calendarPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Folder Colors Endpoints
// ============================================

const FOLDER_COLORS_FILE = 'folder-colors.json';

// Read folder colors
app.get('/api/folder-colors', async (req, res) => {
  try {
    const { projectPath } = req.query;
    const colorsPath = path.join(projectPath, FOLDER_COLORS_FILE);

    try {
      const content = await fs.readFile(colorsPath, 'utf-8');
      res.json(JSON.parse(content));
    } catch {
      // Return empty object if file doesn't exist
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write folder colors
app.post('/api/folder-colors', async (req, res) => {
  try {
    const { projectPath, colors } = req.body;
    const colorsPath = path.join(projectPath, FOLDER_COLORS_FILE);
    await fs.writeFile(colorsPath, JSON.stringify(colors, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Templates Endpoints
// ============================================

const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

// Ensure templates directory exists
await fs.mkdir(TEMPLATES_DIR, { recursive: true });

// Read templates from a directory
app.get('/api/templates', async (req, res) => {
  try {
    const { path: templatePath } = req.query;

    // Determine actual path - 'global' means app-wide templates
    let actualPath;
    if (templatePath === 'global') {
      actualPath = TEMPLATES_DIR;
    } else {
      actualPath = templatePath;
    }

    // Ensure directory exists
    try {
      await fs.access(actualPath);
    } catch {
      // Directory doesn't exist, return empty array
      return res.json([]);
    }

    const entries = await fs.readdir(actualPath, { withFileTypes: true });
    const templates = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(actualPath, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        templates.push({
          name: entry.name,
          content,
        });
      }
    }

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a template
app.post('/api/templates', async (req, res) => {
  try {
    const { path: templatePath, fileName, content } = req.body;

    // Determine actual path - 'global' means app-wide templates
    let actualPath;
    if (templatePath === 'global') {
      actualPath = TEMPLATES_DIR;
    } else {
      actualPath = templatePath;
    }

    // Ensure directory exists
    await fs.mkdir(actualPath, { recursive: true });

    const filePath = path.join(actualPath, fileName);
    await fs.writeFile(filePath, content);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dialog Endpoints (for file/folder selection UI)
// ============================================

// Since we're not using native dialogs anymore, we'll handle project creation
// differently - projects are created in the PROJECTS_BASE directory

// ============================================
// Catch-all for SPA routing
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Dreamer server running on port ${PORT}`);
  console.log(`Projects directory: ${PROJECTS_BASE}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
