import type { CanvasElement, AnchorPosition } from '../types';
import { useCanvasStore } from '../store';

interface AnchorPointsProps {
  element: CanvasElement;
  onAnchorMouseDown: (elementId: string, anchor: AnchorPosition) => void;
  isConnecting: boolean;
  onAnchorMouseUp?: (elementId: string, anchor: AnchorPosition) => void;
}

export function AnchorPoints({
  element,
  onAnchorMouseDown,
  isConnecting,
  onAnchorMouseUp
}: AnchorPointsProps) {
  const { viewport } = useCanvasStore();
  const { id, x, y, width, height } = element;

  // Size of anchor points, scaled by zoom
  const anchorSize = 10 / viewport.zoom;

  const anchors: { position: AnchorPosition; cx: number; cy: number }[] = [
    { position: 'top', cx: x + width / 2, cy: y },
    { position: 'right', cx: x + width, cy: y + height / 2 },
    { position: 'bottom', cx: x + width / 2, cy: y + height },
    { position: 'left', cx: x, cy: y + height / 2 },
  ];

  return (
    <>
      {anchors.map(({ position, cx, cy }) => (
        <div
          key={position}
          className={`absolute rounded-full border-2 transition-all shadow-sm ${
            isConnecting
              ? 'bg-indigo-500 border-indigo-600 cursor-crosshair scale-110'
              : 'bg-white border-indigo-400 cursor-crosshair hover:bg-indigo-50 hover:border-indigo-500 hover:scale-110'
          }`}
          style={{
            left: cx - anchorSize / 2,
            top: cy - anchorSize / 2,
            width: anchorSize,
            height: anchorSize,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onAnchorMouseDown(id, position);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (onAnchorMouseUp) {
              onAnchorMouseUp(id, position);
            }
          }}
        />
      ))}
    </>
  );
}
