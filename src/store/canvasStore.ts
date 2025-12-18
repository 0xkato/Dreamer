import { create } from 'zustand';
import type { ViewportState, ToolType } from '../types';

interface CanvasStore {
  // Viewport
  viewport: ViewportState;
  setViewport: (viewport: Partial<ViewportState>) => void;
  pan: (dx: number, dy: number) => void;
  zoomTo: (zoom: number, centerX: number, centerY: number) => void;
  resetViewport: () => void;

  // Tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Grid
  showGrid: boolean;
  toggleGrid: () => void;

  // Coordinate transforms
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
}

const INITIAL_VIEWPORT: ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Viewport state
  viewport: INITIAL_VIEWPORT,

  setViewport: (partial) =>
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    })),

  pan: (dx, dy) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        panX: state.viewport.panX + dx,
        panY: state.viewport.panY + dy,
      },
    })),

  // Zoom centered around a point (cursor position)
  zoomTo: (newZoom, centerX, centerY) =>
    set((state) => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      const { viewport } = state;

      // Calculate the canvas point under the cursor before zoom
      const canvasX = (centerX - viewport.panX) / viewport.zoom;
      const canvasY = (centerY - viewport.panY) / viewport.zoom;

      // Calculate new pan to keep the same canvas point under cursor
      const newPanX = centerX - canvasX * clampedZoom;
      const newPanY = centerY - canvasY * clampedZoom;

      return {
        viewport: {
          panX: newPanX,
          panY: newPanY,
          zoom: clampedZoom,
        },
      };
    }),

  resetViewport: () => set({ viewport: INITIAL_VIEWPORT }),

  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Grid
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  // Coordinate transforms
  screenToCanvas: (screenX, screenY) => {
    const { viewport } = get();
    return {
      x: (screenX - viewport.panX) / viewport.zoom,
      y: (screenY - viewport.panY) / viewport.zoom,
    };
  },

  canvasToScreen: (canvasX, canvasY) => {
    const { viewport } = get();
    return {
      x: canvasX * viewport.zoom + viewport.panX,
      y: canvasY * viewport.zoom + viewport.panY,
    };
  },
}));
