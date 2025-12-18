import type { DrawingElement, Point } from '../types';

interface DrawingRendererProps {
  element: DrawingElement;
  isSelected: boolean;
}

// Convert points array to SVG path d attribute
function pointsToPath(points: Point[], offsetX: number = 0, offsetY: number = 0): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x + offsetX} ${points[0].y + offsetY}`;

  // Use quadratic bezier curves for smoother lines
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2 + offsetX;
    const yc = (points[i].y + points[i + 1].y) / 2 + offsetY;
    d += ` Q ${points[i].x + offsetX} ${points[i].y + offsetY}, ${xc} ${yc}`;
  }

  // Last point
  if (points.length > 1) {
    const last = points[points.length - 1];
    d += ` L ${last.x + offsetX} ${last.y + offsetY}`;
  }

  return d;
}

export function DrawingRenderer({ element, isSelected }: DrawingRendererProps) {
  const { x, y, points, style } = element;
  // Points are stored relative to element position, so offset by x,y when rendering
  const pathD = pointsToPath(points, x, y);

  if (!pathD) return null;

  return (
    <svg
      className="absolute top-0 left-0 overflow-visible pointer-events-none"
      style={{ width: 1, height: 1 }}
    >
      {/* Selection highlight (behind the stroke) */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={style.strokeWidth + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
        />
      )}

      {/* Main stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={style.opacity}
      />
    </svg>
  );
}

// Preview component for drawing in progress
interface DrawingPreviewProps {
  points: Point[];
  strokeColor?: string;
  strokeWidth?: number;
}

export function DrawingPreview({
  points,
  strokeColor = '#334155',
  strokeWidth = 2,
}: DrawingPreviewProps) {
  const pathD = pointsToPath(points);

  if (!pathD) return null;

  return (
    <svg
      className="absolute top-0 left-0 overflow-visible pointer-events-none"
      style={{ width: 1, height: 1 }}
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
