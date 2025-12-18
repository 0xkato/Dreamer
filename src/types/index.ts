// Core geometry types
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

// Element types
export type ShapeType = 'rectangle' | 'roundedRectangle' | 'ellipse';
export type ElementType = 'shape' | 'text' | 'connector' | 'drawing';
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

// Style types
export interface ShapeStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius?: number; // For rounded rectangles
  shadow?: boolean;
}

export interface TextStyle {
  color: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
}

export interface ConnectorStyle {
  strokeColor: string;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed';
  arrowStart: boolean;
  arrowEnd: boolean;
}

export interface DrawingStyle {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

// Base element
export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
}

// Shape element
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  style: ShapeStyle;
  text: string;
  textStyle: TextStyle;
}

// Standalone text element
export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  textStyle: TextStyle;
}

// Drawing element (freehand)
export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: Point[];
  style: DrawingStyle;
}

// Connector element
export interface ConnectorElement {
  id: string;
  type: 'connector';
  sourceId: string;
  targetId: string;
  sourceAnchor: AnchorPosition;
  targetAnchor: AnchorPosition;
  style: ConnectorStyle;
  waypoints?: Point[]; // For manual routing overrides
}

// Union type for all elements
export type CanvasElement = ShapeElement | TextElement | DrawingElement;
export type DiagramElement = CanvasElement | ConnectorElement;

// Viewport state
export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

// Selection state
export interface SelectionState {
  selectedIds: string[];
  selectionBox: Rect | null;
}

// Tool types
export type ToolType = 'select' | 'rectangle' | 'roundedRectangle' | 'ellipse' | 'text' | 'connector' | 'freehand';

// History for undo/redo
export interface HistoryEntry {
  elements: CanvasElement[];
  connectors: ConnectorElement[];
}

// File format
export interface DiagramFile {
  version: string;
  metadata: {
    name: string;
    created: string;
    modified: string;
  };
  viewport: ViewportState;
  elements: CanvasElement[];
  connectors: ConnectorElement[];
}

// Default styles - soft, modern colors
export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  fillColor: '#ffffff',
  strokeColor: '#cbd5e1',
  strokeWidth: 1.5,
  shadow: false,
  borderRadius: 8,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  color: '#334155',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  bold: false,
  italic: false,
  align: 'center',
};

export const DEFAULT_CONNECTOR_STYLE: ConnectorStyle = {
  strokeColor: '#94a3b8',
  strokeWidth: 1.5,
  lineStyle: 'solid',
  arrowStart: false,
  arrowEnd: true,
};

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  strokeColor: '#334155',
  strokeWidth: 2,
  opacity: 1,
};
