# Templates and Symbols Feature Design

## Overview

Add templates for creating new markdown files and inserting snippets, plus a symbol library accessible via toolbar buttons and slash commands.

## Template Storage

### Locations
- **Global templates**: `~/.dreamer/templates/` - available across all projects
- **Project templates**: `.templates/` folder at project root - takes priority over global templates with same name

### Template Format

Templates are markdown files with optional YAML frontmatter:

```markdown
---
name: Meeting Notes
category: work
type: template
---
# Meeting: {{title}}

**Date:** {{date}}
**Attendees:**

## Agenda

## Discussion

## Action Items
- [ ]
```

**Frontmatter fields:**
- `name` - Display name in picker (falls back to filename)
- `category` - Groups templates in UI (e.g., "work", "personal")
- `type` - Either `template` (new file) or `snippet` (insertion)

**Placeholders:**
- `{{title}}` - Replaced with filename when creating
- `{{date}}` - Replaced with current date (YYYY-MM-DD)

## New File Dialog with Template Picker

When creating a new markdown file, the dialog shows:

1. **Filename input** at top
2. **Template list** below:
   - "Blank" at top (selected by default)
   - Project templates (under "Project" header, if any exist)
   - Global templates (under "Global" header)
   - Each template shows name and category tag

**Behavior:**
- Arrow keys navigate templates
- Typing filters the list
- Enter creates file with selected template
- If no templates exist, shows hint: "Save any file as a template to see it here"

## Slash Command Menu

Type `/` in the editor to open a floating menu at cursor position.

### Symbols Section

| Command | Symbol | Description |
|---------|--------|-------------|
| `/check` | ✓ | Checkmark |
| `/x` | ✗ | X mark |
| `/warning` | ⚠ | Warning |
| `/info` | ℹ | Information |
| `/star` | ★ | Star/priority |
| `/arrow` | → | Arrow |
| `/bullet` | • | Bullet point |
| `/priority` | ⚡ | High priority |

### Snippets Section

Shows templates with `type: snippet` in frontmatter. These insert content at cursor rather than creating new files.

### Behavior

- Typing after `/` filters the list
- Arrow keys to navigate, Enter to insert
- Escape or click away to close
- The `/` and filter text get replaced by selected item
- Menu positioned below cursor, inline with text

## Symbol Toolbar Buttons

Add to the right side of existing markdown toolbar:

**Buttons:** ✓ ✗ ⚠ →

**Behavior:**
- Click inserts symbol at cursor
- Tooltip shows name and slash shortcut
- Overflow button (`⋯`) opens full symbol menu

## Save as Template

### Trigger
Right-click any markdown file in file tree → "Save as Template"

### Dialog Fields
- **Template name** - Pre-filled with filename, editable
- **Category** - Optional (e.g., "work", "personal")
- **Type** - Radio: "New file template" or "Snippet"
- **Location** - Radio: "Global" or "This project only"

### Behavior
- Copies file content to appropriate templates folder
- Adds/updates frontmatter based on dialog inputs
- Shows confirmation toast: "Template saved"
- Help text: "Use `{{title}}` and `{{date}}` as placeholders"

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/components/MarkdownEditor/SlashCommandMenu.tsx` | Floating menu component |
| `src/components/FileTree/SaveAsTemplateDialog.tsx` | Save as template dialog |
| `src/services/templateService.ts` | Load/save templates, placeholder replacement |
| `src/store/templateStore.ts` | Zustand store for template state |

### Modified Files

| File | Changes |
|------|---------|
| `NewFileDialog.tsx` | Add template picker list |
| `MarkdownEditor.tsx` | Slash command detection, menu integration |
| `MarkdownToolbar.tsx` | Add symbol buttons |
| `FileTreeContextMenu.tsx` | Add "Save as Template" option |
| `server/index.js` | Endpoints for global templates folder |

### Key Logic

- CodeMirror extension detects `/` and triggers menu
- Template loading merges global + project (project wins on conflicts)
- Placeholder replacement at file creation time
