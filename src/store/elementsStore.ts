import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasElement,
  ConnectorElement,
  ShapeElement,
  TextElement,
  DrawingElement,
  ShapeType,
  Point,
  AnchorPosition,
  HistoryEntry,
  DiagramFile,
} from '../types';
import {
  DEFAULT_SHAPE_STYLE as defaultShapeStyle,
  DEFAULT_TEXT_STYLE as defaultTextStyle,
  DEFAULT_CONNECTOR_STYLE as defaultConnectorStyle,
  DEFAULT_DRAWING_STYLE as defaultDrawingStyle,
} from '../types';
import { saveDiagram } from '../utils/storage';
import { useCanvasStore } from './canvasStore';

interface ElementsStore {
  // Elements
  elements: CanvasElement[];
  connectors: ConnectorElement[];

  // Current diagram context
  currentDiagramId: string | null;
  currentDiagramName: string | null;
  isDirty: boolean;
  setCurrentDiagram: (id: string, name: string) => void;
  clearCurrentDiagram: () => void;
  markClean: () => void;
  initializeFromStorage: () => void;

  // Selection
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;

  // Element CRUD
  addShape: (shapeType: ShapeType, x: number, y: number) => string;
  addText: (x: number, y: number) => string;
  addDrawing: (points: Point[]) => string;
  addConnector: (sourceId: string, targetId: string) => string;
  addConnectorWithAnchors: (
    sourceId: string,
    sourceAnchor: AnchorPosition,
    targetId: string,
    targetAnchor: AnchorPosition
  ) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateConnector: (id: string, updates: Partial<ConnectorElement>) => void;
  deleteSelected: () => void;
  deleteElement: (id: string) => void;

  // Movement
  moveElements: (ids: string[], dx: number, dy: number) => void;
  resizeElement: (id: string, width: number, height: number, x?: number, y?: number) => void;

  // Connector anchors
  updateConnectorAnchors: () => void;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Clipboard
  clipboard: CanvasElement[];
  copy: () => void;
  paste: (offsetX?: number, offsetY?: number) => void;
  cut: () => void;

  // Reset
  reset: () => void;
  loadDiagram: (elements: CanvasElement[], connectors: ConnectorElement[]) => void;
}

// Calculate the best anchor point between two elements (shortest distance)
function calculateBestAnchors(
  source: CanvasElement,
  target: CanvasElement
): { sourceAnchor: AnchorPosition; targetAnchor: AnchorPosition } {
  const sourceAnchors = getAnchorPoints(source);
  const targetAnchors = getAnchorPoints(target);

  let minDistance = Infinity;
  let bestSource: AnchorPosition = 'right';
  let bestTarget: AnchorPosition = 'left';

  // Test all combinations and find the shortest
  const positions: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];
  for (const sPos of positions) {
    for (const tPos of positions) {
      const sPoint = sourceAnchors[sPos];
      const tPoint = targetAnchors[tPos];
      const distance = Math.hypot(tPoint.x - sPoint.x, tPoint.y - sPoint.y);

      if (distance < minDistance) {
        minDistance = distance;
        bestSource = sPos;
        bestTarget = tPos;
      }
    }
  }

  return { sourceAnchor: bestSource, targetAnchor: bestTarget };
}

// Get anchor points for an element (middle of each edge)
function getAnchorPoints(element: CanvasElement): Record<AnchorPosition, Point> {
  const { x, y, width, height } = element;
  return {
    top: { x: x + width / 2, y },
    right: { x: x + width, y: y + height / 2 },
    bottom: { x: x + width / 2, y: y + height },
    left: { x, y: y + height / 2 },
  };
}

const MAX_HISTORY = 50;
const CURRENT_DIAGRAM_KEY = 'dreamer_current_diagram';

export const useElementsStore = create<ElementsStore>((set, get) => ({
  elements: [],
  connectors: [],
  selectedIds: [],
  history: [],
  historyIndex: -1,
  clipboard: [],

  // Current diagram context
  currentDiagramId: null,
  currentDiagramName: null,
  isDirty: false,

  setCurrentDiagram: (id, name) => {
    // Persist to localStorage
    localStorage.setItem(CURRENT_DIAGRAM_KEY, JSON.stringify({ id, name }));
    set({
      currentDiagramId: id,
      currentDiagramName: name,
      isDirty: false,
    });
  },

  clearCurrentDiagram: () => {
    // Clear from localStorage
    localStorage.removeItem(CURRENT_DIAGRAM_KEY);
    set({
      currentDiagramId: null,
      currentDiagramName: null,
      isDirty: false,
    });
  },

  markClean: () => set({ isDirty: false }),

  initializeFromStorage: () => {
    try {
      const stored = localStorage.getItem(CURRENT_DIAGRAM_KEY);
      if (stored) {
        const { id, name } = JSON.parse(stored);
        set({
          currentDiagramId: id,
          currentDiagramName: name,
          isDirty: false,
        });
      }
    } catch {
      // Ignore parse errors
    }
  },

  // Selection
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    })),

  // Add shape
  addShape: (shapeType, x, y) => {
    const id = uuidv4();
    const shape: ShapeElement = {
      id,
      type: 'shape',
      shapeType,
      x,
      y,
      width: 120,
      height: 80,
      style: { ...defaultShapeStyle },
      text: '',
      textStyle: { ...defaultTextStyle },
    };

    set((state) => ({
      elements: [...state.elements, shape],
      selectedIds: [id],
    }));

    get().pushHistory();
    return id;
  },

  // Add text
  addText: (x, y) => {
    const id = uuidv4();
    const text: TextElement = {
      id,
      type: 'text',
      x,
      y,
      width: 150,
      height: 40,
      text: 'Text',
      textStyle: { ...defaultTextStyle },
    };

    set((state) => ({
      elements: [...state.elements, text],
      selectedIds: [id],
    }));

    get().pushHistory();
    return id;
  },

  // Add drawing (freehand)
  addDrawing: (points) => {
    if (points.length < 2) return '';

    const id = uuidv4();

    // Calculate bounding box
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Store points relative to the bounding box origin
    const relativePoints = points.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    const drawing: DrawingElement = {
      id,
      type: 'drawing',
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      points: relativePoints,
      style: { ...defaultDrawingStyle },
    };

    set((state) => ({
      elements: [...state.elements, drawing],
      selectedIds: [id],
    }));

    get().pushHistory();
    return id;
  },

  // Add connector
  addConnector: (sourceId, targetId) => {
    const { elements } = get();
    const source = elements.find((e) => e.id === sourceId);
    const target = elements.find((e) => e.id === targetId);

    if (!source || !target) return '';

    const { sourceAnchor, targetAnchor } = calculateBestAnchors(source, target);

    const id = uuidv4();
    const connector: ConnectorElement = {
      id,
      type: 'connector',
      sourceId,
      targetId,
      sourceAnchor,
      targetAnchor,
      style: { ...defaultConnectorStyle },
    };

    set((state) => ({
      connectors: [...state.connectors, connector],
      selectedIds: [id],
    }));

    get().pushHistory();
    return id;
  },

  // Add connector with specific anchors (user-selected)
  addConnectorWithAnchors: (sourceId, sourceAnchor, targetId, targetAnchor) => {
    const { elements } = get();
    const source = elements.find((e) => e.id === sourceId);
    const target = elements.find((e) => e.id === targetId);

    if (!source || !target) return '';

    const id = uuidv4();
    const connector: ConnectorElement = {
      id,
      type: 'connector',
      sourceId,
      targetId,
      sourceAnchor,
      targetAnchor,
      style: { ...defaultConnectorStyle },
    };

    set((state) => ({
      connectors: [...state.connectors, connector],
      selectedIds: [id],
    }));

    get().pushHistory();
    return id;
  },

  // Update element
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
      ),
    })),

  // Update connector
  updateConnector: (id, updates) =>
    set((state) => ({
      connectors: state.connectors.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  // Delete selected
  deleteSelected: () => {
    const { selectedIds, elements, connectors } = get();

    // Also delete connectors connected to deleted elements
    const connectorIdsToDelete = connectors
      .filter((c) => selectedIds.includes(c.sourceId) || selectedIds.includes(c.targetId))
      .map((c) => c.id);

    set({
      elements: elements.filter((el) => !selectedIds.includes(el.id)),
      connectors: connectors.filter(
        (c) => !selectedIds.includes(c.id) && !connectorIdsToDelete.includes(c.id)
      ),
      selectedIds: [],
    });

    get().pushHistory();
  },

  // Delete single element
  deleteElement: (id) => {
    const { connectors } = get();

    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      connectors: connectors.filter(
        (c) => c.id !== id && c.sourceId !== id && c.targetId !== id
      ),
      selectedIds: state.selectedIds.filter((i) => i !== id),
    }));

    get().pushHistory();
  },

  // Move elements
  moveElements: (ids, dx, dy) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        ids.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
      ),
    }));
    // Note: We do NOT recalculate connector anchors here.
    // The user explicitly chose which anchors to connect, and we honor that choice.
    // If they want to change anchors, they must delete and recreate the connector.
  },

  // Resize element
  resizeElement: (id, width, height, x, y) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              width: Math.max(20, width),
              height: Math.max(20, height),
              ...(x !== undefined && { x }),
              ...(y !== undefined && { y }),
            }
          : el
      ),
    })),

  // Update connector anchors based on current element positions
  updateConnectorAnchors: () => {
    const { elements, connectors } = get();

    const updatedConnectors = connectors.map((connector) => {
      const source = elements.find((e) => e.id === connector.sourceId);
      const target = elements.find((e) => e.id === connector.targetId);

      if (!source || !target) return connector;

      const { sourceAnchor, targetAnchor } = calculateBestAnchors(source, target);
      return { ...connector, sourceAnchor, targetAnchor };
    });

    set({ connectors: updatedConnectors });
  },

  // History
  pushHistory: () => {
    set((state) => {
      const entry: HistoryEntry = {
        elements: JSON.parse(JSON.stringify(state.elements)),
        connectors: JSON.parse(JSON.stringify(state.connectors)),
      };

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(entry);

      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });

    // Auto-save to current diagram
    const { currentDiagramId, currentDiagramName, elements, connectors } = get();
    if (currentDiagramId && currentDiagramName) {
      const viewport = useCanvasStore.getState().viewport;
      const diagram: DiagramFile = {
        version: '1.0.0',
        metadata: {
          name: currentDiagramName,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport,
        elements,
        connectors,
      };
      saveDiagram(currentDiagramName, diagram);
    }
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const entry = state.history[newIndex];

    set({
      elements: JSON.parse(JSON.stringify(entry.elements)),
      connectors: JSON.parse(JSON.stringify(entry.connectors)),
      historyIndex: newIndex,
      selectedIds: [],
    });

    // Auto-save after undo
    const { currentDiagramId, currentDiagramName } = get();
    if (currentDiagramId && currentDiagramName) {
      const viewport = useCanvasStore.getState().viewport;
      const diagram: DiagramFile = {
        version: '1.0.0',
        metadata: {
          name: currentDiagramName,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport,
        elements: entry.elements,
        connectors: entry.connectors,
      };
      saveDiagram(currentDiagramName, diagram);
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const entry = state.history[newIndex];

    set({
      elements: JSON.parse(JSON.stringify(entry.elements)),
      connectors: JSON.parse(JSON.stringify(entry.connectors)),
      historyIndex: newIndex,
      selectedIds: [],
    });

    // Auto-save after redo
    const { currentDiagramId, currentDiagramName } = get();
    if (currentDiagramId && currentDiagramName) {
      const viewport = useCanvasStore.getState().viewport;
      const diagram: DiagramFile = {
        version: '1.0.0',
        metadata: {
          name: currentDiagramName,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
        viewport,
        elements: entry.elements,
        connectors: entry.connectors,
      };
      saveDiagram(currentDiagramName, diagram);
    }
  },

  // Clipboard
  copy: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      return { clipboard: JSON.parse(JSON.stringify(selected)) };
    }),

  paste: (offsetX = 20, offsetY = 20) => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    const newElements = clipboard.map((el) => ({
      ...el,
      id: uuidv4(),
      x: el.x + offsetX,
      y: el.y + offsetY,
    }));

    set((state) => ({
      elements: [...state.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    }));

    get().pushHistory();
  },

  cut: () => {
    get().copy();
    get().deleteSelected();
  },

  // Reset
  reset: () =>
    set({
      elements: [],
      connectors: [],
      selectedIds: [],
      history: [],
      historyIndex: -1,
      currentDiagramId: null,
      currentDiagramName: null,
      isDirty: false,
    }),

  // Load diagram
  loadDiagram: (elements, connectors) =>
    set({
      elements,
      connectors,
      selectedIds: [],
      history: [],
      historyIndex: -1,
      isDirty: false,
    }),
}));
