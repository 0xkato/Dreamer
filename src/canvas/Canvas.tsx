import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvasStore, useElementsStore } from '../store';
import { ShapeRenderer } from '../elements/ShapeRenderer';
import { TextRenderer } from '../elements/TextRenderer';
import { ConnectorRenderer } from '../elements/ConnectorRenderer';
import { DrawingRenderer, DrawingPreview } from '../elements/DrawingRenderer';
import { AnchorPoints } from '../elements/AnchorPoints';
import { SelectionHandles } from './SelectionHandles';
import { Grid } from './Grid';
import type { Point, Rect, CanvasElement, AnchorPosition } from '../types';
import { normalizeRect, rectsIntersect, pointInRect, pointInEllipse, pointNearLine, pointNearPath, getAnchorPoints } from '../utils/geometry';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [selectionBox, setSelectionBox] = useState<Rect | null>(null);

  // Connector drawing state
  const [isDrawingConnector, setIsDrawingConnector] = useState(false);
  const [connectorSource, setConnectorSource] = useState<{ elementId: string; anchor: AnchorPosition } | null>(null);
  const [connectorPreview, setConnectorPreview] = useState<Point | null>(null);

  // Hover state for showing anchor points
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Freehand drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  // Track if CMD/Ctrl key is held for pan cursor hint
  const [isSpaceOrCmdHeld, setIsSpaceOrCmdHeld] = useState(false);

  const {
    viewport,
    pan,
    zoomTo,
    screenToCanvas,
    activeTool,
    setActiveTool,
    showGrid,
  } = useCanvasStore();

  const {
    elements,
    connectors,
    selectedIds,
    setSelectedIds,
    clearSelection,
    toggleSelection,
    addShape,
    addText,
    addDrawing,
    addConnectorWithAnchors,
    moveElements,
    pushHistory,
  } = useElementsStore();

  // Track CMD/Ctrl key state for pan cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsSpaceOrCmdHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsSpaceOrCmdHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Hit test to find element at a point
  const hitTest = useCallback(
    (canvasPoint: Point): string | null => {
      // Check elements in reverse order (top to bottom)
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const rect = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };

        if (element.type === 'drawing') {
          // Hit test for drawing paths - points are relative, so offset them
          const absolutePoints = element.points.map((p) => ({
            x: p.x + element.x,
            y: p.y + element.y,
          }));
          if (pointNearPath(canvasPoint, absolutePoints, 8 / viewport.zoom)) {
            return element.id;
          }
        } else if (element.type === 'shape' && element.shapeType === 'ellipse') {
          if (pointInEllipse(canvasPoint, rect)) {
            return element.id;
          }
        } else if (pointInRect(canvasPoint, rect)) {
          return element.id;
        }
      }

      // Check connectors
      for (const connector of connectors) {
        const source = elements.find((e) => e.id === connector.sourceId);
        const target = elements.find((e) => e.id === connector.targetId);

        if (source && target) {
          const sourceAnchors = getAnchorPoints(source);
          const targetAnchors = getAnchorPoints(target);
          const start = sourceAnchors[connector.sourceAnchor];
          const end = targetAnchors[connector.targetAnchor];

          if (pointNearLine(canvasPoint, start, end, 8 / viewport.zoom)) {
            return connector.id;
          }
        }
      }

      return null;
    },
    [elements, connectors, viewport.zoom]
  );

  // Handle anchor mouse down - start drawing connector
  const handleAnchorMouseDown = (elementId: string, anchor: AnchorPosition) => {
    setIsDrawingConnector(true);
    setConnectorSource({ elementId, anchor });

    // Get the anchor point position for preview
    const element = elements.find(e => e.id === elementId);
    if (element) {
      const anchors = getAnchorPoints(element);
      setConnectorPreview(anchors[anchor]);
    }
  };

  // Handle anchor mouse up - complete connector
  const handleAnchorMouseUp = (elementId: string, anchor: AnchorPosition) => {
    if (isDrawingConnector && connectorSource && connectorSource.elementId !== elementId) {
      addConnectorWithAnchors(
        connectorSource.elementId,
        connectorSource.anchor,
        elementId,
        anchor
      );
    }

    setIsDrawingConnector(false);
    setConnectorSource(null);
    setConnectorPreview(null);
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY);

    // Middle mouse button for panning (allowed without session)
    if (e.button === 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // CMD/Ctrl + left click for panning (allowed without session)
    if (e.button === 0 && (e.metaKey || e.ctrlKey)) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Right click - do nothing for now
    if (e.button === 2) return;

    // If drawing connector, cancel on canvas click
    if (isDrawingConnector) {
      setIsDrawingConnector(false);
      setConnectorSource(null);
      setConnectorPreview(null);
      return;
    }

    // Left click
    if (activeTool === 'select') {
      const hitId = hitTest(canvasPoint);

      if (hitId) {
        // Shift-click to toggle selection
        if (e.shiftKey) {
          toggleSelection(hitId);
        } else if (!selectedIds.includes(hitId)) {
          setSelectedIds([hitId]);
        }

        // Start dragging
        setIsDragging(true);
        setDragStart(canvasPoint);
      } else {
        // Start selection box
        if (!e.shiftKey) {
          clearSelection();
        }
        setDragStart(canvasPoint);
        setSelectionBox({
          x: canvasPoint.x,
          y: canvasPoint.y,
          width: 0,
          height: 0,
        });
      }
    } else if (activeTool === 'freehand') {
      // Start freehand drawing
      setIsDrawing(true);
      setDrawingPoints([canvasPoint]);
      clearSelection();
    } else if (activeTool === 'connector') {
      // Legacy connector tool - click on element to start
      const hitId = hitTest(canvasPoint);
      if (hitId && elements.find((e) => e.id === hitId)) {
        // Find closest anchor to click point
        const element = elements.find(e => e.id === hitId)!;
        const anchors = getAnchorPoints(element);
        let closestAnchor: AnchorPosition = 'right';
        let minDist = Infinity;

        for (const [pos, point] of Object.entries(anchors)) {
          const dist = Math.hypot(canvasPoint.x - point.x, canvasPoint.y - point.y);
          if (dist < minDist) {
            minDist = dist;
            closestAnchor = pos as AnchorPosition;
          }
        }

        handleAnchorMouseDown(hitId, closestAnchor);
      }
    } else {
      // Creating a shape or text
      let elementId: string | undefined;

      if (activeTool === 'rectangle') {
        elementId = addShape('rectangle', canvasPoint.x - 60, canvasPoint.y - 40);
      } else if (activeTool === 'roundedRectangle') {
        elementId = addShape('roundedRectangle', canvasPoint.x - 60, canvasPoint.y - 40);
      } else if (activeTool === 'ellipse') {
        elementId = addShape('ellipse', canvasPoint.x - 60, canvasPoint.y - 40);
      } else if (activeTool === 'text') {
        elementId = addText(canvasPoint.x - 75, canvasPoint.y - 20);
      }

      if (elementId) {
        setActiveTool('select');
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY);

    // Update hover state
    if (!isDragging && !isPanning && !selectionBox) {
      const hitId = hitTest(canvasPoint);
      // Only show anchors for shape/text elements, not connectors
      const isElement = hitId && elements.find(e => e.id === hitId);
      setHoveredElementId(isElement ? hitId : null);
    }

    // Panning
    if (isPanning && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      pan(dx, dy);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Dragging elements
    if (isDragging && dragStart && selectedIds.length > 0) {
      const dx = canvasPoint.x - dragStart.x;
      const dy = canvasPoint.y - dragStart.y;
      moveElements(selectedIds, dx, dy);
      setDragStart(canvasPoint);
      return;
    }

    // Drawing selection box
    if (selectionBox && dragStart) {
      setSelectionBox({
        x: dragStart.x,
        y: dragStart.y,
        width: canvasPoint.x - dragStart.x,
        height: canvasPoint.y - dragStart.y,
      });
      return;
    }

    // Drawing connector preview
    if (isDrawingConnector && connectorSource) {
      setConnectorPreview(canvasPoint);
    }

    // Freehand drawing - add points
    if (isDrawing) {
      setDrawingPoints((prev) => [...prev, canvasPoint]);
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY);

    // End freehand drawing
    if (isDrawing && drawingPoints.length > 1) {
      addDrawing(drawingPoints);
      setIsDrawing(false);
      setDrawingPoints([]);
      return;
    } else if (isDrawing) {
      // Not enough points, cancel
      setIsDrawing(false);
      setDrawingPoints([]);
      return;
    }

    // End panning
    if (isPanning) {
      setIsPanning(false);
      setDragStart(null);
      return;
    }

    // End dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      pushHistory();
      return;
    }

    // End selection box
    if (selectionBox) {
      const normalized = normalizeRect(selectionBox);
      const selectedElements = elements.filter((el) =>
        rectsIntersect(normalized, {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
        })
      );

      if (e.shiftKey) {
        // Add to selection
        const newIds = selectedElements.map((el) => el.id);
        setSelectedIds([...new Set([...selectedIds, ...newIds])]);
      } else {
        setSelectedIds(selectedElements.map((el) => el.id));
      }

      setSelectionBox(null);
      setDragStart(null);
      return;
    }

    // End connector drawing (when released on canvas, not on anchor)
    if (isDrawingConnector && connectorSource) {
      // Check if we're over an element
      const hitId = hitTest(canvasPoint);
      if (hitId && hitId !== connectorSource.elementId && elements.find((e) => e.id === hitId)) {
        // Find closest anchor to release point
        const element = elements.find(e => e.id === hitId)!;
        const anchors = getAnchorPoints(element);
        let closestAnchor: AnchorPosition = 'left';
        let minDist = Infinity;

        for (const [pos, point] of Object.entries(anchors)) {
          const dist = Math.hypot(canvasPoint.x - point.x, canvasPoint.y - point.y);
          if (dist < minDist) {
            minDist = dist;
            closestAnchor = pos as AnchorPosition;
          }
        }

        addConnectorWithAnchors(
          connectorSource.elementId,
          connectorSource.anchor,
          hitId,
          closestAnchor
        );
      }

      setIsDrawingConnector(false);
      setConnectorSource(null);
      setConnectorPreview(null);

      if (activeTool === 'connector') {
        setActiveTool('select');
      }
    }
  };

  // Handle wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;

    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = viewport.zoom * delta;

    zoomTo(newZoom, centerX, centerY);
  };

  // Prevent context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Get cursor style based on current tool/state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isSpaceOrCmdHeld) return 'grab';
    if (isDrawingConnector) return 'crosshair';
    if (isDrawing) return 'crosshair';
    if (activeTool === 'freehand') return 'crosshair';
    if (activeTool !== 'select') return 'crosshair';
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-gray-50"
      style={{ cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp({} as React.MouseEvent);
        setHoveredElementId(null);
      }}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* Canvas transform container */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {/* Grid background */}
        {showGrid && <Grid />}

        {/* Connectors (rendered below shapes) */}
        <svg
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          style={{ width: 1, height: 1 }}
        >
          {connectors.map((connector) => (
            <ConnectorRenderer
              key={connector.id}
              connector={connector}
              elements={elements}
              isSelected={selectedIds.includes(connector.id)}
            />
          ))}

          {/* Connector preview while drawing */}
          {isDrawingConnector && connectorSource && connectorPreview && (
            <ConnectorPreviewLine
              source={connectorSource}
              targetPoint={connectorPreview}
              elements={elements}
            />
          )}
        </svg>

        {/* Freehand drawing preview */}
        {isDrawing && drawingPoints.length > 0 && (
          <DrawingPreview points={drawingPoints} />
        )}

        {/* Elements */}
        {elements.map((element) => {
          const isSelected = selectedIds.includes(element.id);
          const showAnchors = hoveredElementId === element.id || isSelected || isDrawingConnector;

          return (
            <div key={element.id}>
              {element.type === 'shape' ? (
                <ShapeRenderer
                  element={element}
                  isSelected={isSelected}
                />
              ) : element.type === 'drawing' ? (
                <DrawingRenderer
                  element={element}
                  isSelected={isSelected}
                />
              ) : (
                <TextRenderer
                  element={element}
                  isSelected={isSelected}
                />
              )}

              {/* Anchor points for connecting (not for drawings) */}
              {showAnchors && element.type !== 'drawing' && (
                <AnchorPoints
                  element={element}
                  onAnchorMouseDown={handleAnchorMouseDown}
                  onAnchorMouseUp={handleAnchorMouseUp}
                  isConnecting={isDrawingConnector}
                />
              )}
            </div>
          );
        })}

        {/* Selection handles for selected elements */}
        {selectedIds.length === 1 && elements.find(e => e.id === selectedIds[0]) && (
          <SelectionHandles
            elementId={selectedIds[0]}
          />
        )}
      </div>

      {/* Selection box (screen coordinates) */}
      {selectionBox && (
        <div
          className="selection-box"
          style={{
            left: (selectionBox.width >= 0 ? selectionBox.x : selectionBox.x + selectionBox.width) * viewport.zoom + viewport.panX,
            top: (selectionBox.height >= 0 ? selectionBox.y : selectionBox.y + selectionBox.height) * viewport.zoom + viewport.panY,
            width: Math.abs(selectionBox.width) * viewport.zoom,
            height: Math.abs(selectionBox.height) * viewport.zoom,
          }}
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/50 text-xs font-medium text-slate-600">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}

// Connector preview line component
function ConnectorPreviewLine({
  source,
  targetPoint,
  elements,
}: {
  source: { elementId: string; anchor: AnchorPosition };
  targetPoint: Point;
  elements: CanvasElement[];
}) {
  const sourceElement = elements.find((e) => e.id === source.elementId);
  if (!sourceElement) return null;

  const sourceAnchors = getAnchorPoints(sourceElement);
  const startPoint = sourceAnchors[source.anchor];

  return (
    <line
      x1={startPoint.x}
      y1={startPoint.y}
      x2={targetPoint.x}
      y2={targetPoint.y}
      stroke="#3b82f6"
      strokeWidth={2}
      strokeDasharray="4 4"
    />
  );
}
