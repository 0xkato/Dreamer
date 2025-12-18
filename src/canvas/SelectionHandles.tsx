import { useCallback } from 'react';
import { useElementsStore, useCanvasStore } from '../store';

interface SelectionHandlesProps {
  elementId: string;
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function SelectionHandles({ elementId }: SelectionHandlesProps) {
  const { elements, resizeElement, pushHistory } = useElementsStore();
  const { viewport } = useCanvasStore();

  const element = elements.find((e) => e.id === elementId);
  if (!element) return null;

  const handleSize = 8 / viewport.zoom;
  const { x, y, width, height } = element;

  const handles: { position: HandlePosition; x: number; y: number; cursor: string }[] = [
    { position: 'nw', x: x, y: y, cursor: 'nw-resize' },
    { position: 'n', x: x + width / 2, y: y, cursor: 'n-resize' },
    { position: 'ne', x: x + width, y: y, cursor: 'ne-resize' },
    { position: 'e', x: x + width, y: y + height / 2, cursor: 'e-resize' },
    { position: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
    { position: 's', x: x + width / 2, y: y + height, cursor: 's-resize' },
    { position: 'sw', x: x, y: y + height, cursor: 'sw-resize' },
    { position: 'w', x: x, y: y + height / 2, cursor: 'w-resize' },
  ];

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, position: HandlePosition) => {
      e.stopPropagation();

      // Capture initial state directly in closure
      const initialX = element.x;
      const initialY = element.y;
      const initialWidth = element.width;
      const initialHeight = element.height;
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startMouseX) / viewport.zoom;
        const dy = (moveEvent.clientY - startMouseY) / viewport.zoom;

        let newX = initialX;
        let newY = initialY;
        let newWidth = initialWidth;
        let newHeight = initialHeight;

        // Calculate new dimensions based on handle position
        switch (position) {
          case 'nw':
            newX = initialX + dx;
            newY = initialY + dy;
            newWidth = initialWidth - dx;
            newHeight = initialHeight - dy;
            break;
          case 'n':
            newY = initialY + dy;
            newHeight = initialHeight - dy;
            break;
          case 'ne':
            newY = initialY + dy;
            newWidth = initialWidth + dx;
            newHeight = initialHeight - dy;
            break;
          case 'e':
            newWidth = initialWidth + dx;
            break;
          case 'se':
            newWidth = initialWidth + dx;
            newHeight = initialHeight + dy;
            break;
          case 's':
            newHeight = initialHeight + dy;
            break;
          case 'sw':
            newX = initialX + dx;
            newWidth = initialWidth - dx;
            newHeight = initialHeight + dy;
            break;
          case 'w':
            newX = initialX + dx;
            newWidth = initialWidth - dx;
            break;
        }

        // Prevent negative dimensions - adjust position if needed
        const minSize = 20;

        if (newWidth < minSize) {
          if (position.includes('w')) {
            newX = initialX + initialWidth - minSize;
          }
          newWidth = minSize;
        }

        if (newHeight < minSize) {
          if (position.includes('n')) {
            newY = initialY + initialHeight - minSize;
          }
          newHeight = minSize;
        }

        resizeElement(elementId, newWidth, newHeight, newX, newY);
      };

      const handleMouseUp = () => {
        pushHistory();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [elementId, element, viewport.zoom, resizeElement, pushHistory]
  );

  return (
    <>
      {/* Selection border */}
      <div
        className="absolute border-2 border-indigo-500 rounded-sm pointer-events-none"
        style={{
          left: x - 1,
          top: y - 1,
          width: width + 2,
          height: height + 2,
        }}
      />

      {/* Resize handles */}
      {handles.map(({ position, x: hx, y: hy, cursor }) => (
        <div
          key={position}
          className="absolute bg-white border-2 border-indigo-500 rounded-sm shadow-sm hover:scale-110 transition-transform"
          style={{
            left: hx - handleSize / 2,
            top: hy - handleSize / 2,
            width: handleSize,
            height: handleSize,
            cursor,
          }}
          onMouseDown={(e) => handleMouseDown(e, position)}
        />
      ))}
    </>
  );
}
