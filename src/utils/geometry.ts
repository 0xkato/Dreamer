import type { Point, Rect, CanvasElement, AnchorPosition } from '../types';

// Check if two rectangles intersect
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Check if a point is inside a rectangle
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Check if a point is inside an ellipse
export function pointInEllipse(point: Point, rect: Rect): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;

  const dx = point.x - cx;
  const dy = point.y - cy;

  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

// Get distance between two points
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Get anchor points for an element (middle of each edge)
export function getAnchorPoints(element: CanvasElement): Record<AnchorPosition, Point> {
  const { x, y, width, height } = element;
  return {
    top: { x: x + width / 2, y },
    right: { x: x + width, y: y + height / 2 },
    bottom: { x: x + width / 2, y: y + height },
    left: { x, y: y + height / 2 },
  };
}

// Get center of a rectangle
export function getCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

// Normalize a selection box (handle negative width/height from drag direction)
export function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

// Check if point is near a line segment (for line selection)
export function pointNearLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
  threshold: number = 5
): boolean {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return distance(point, lineStart) <= threshold;
  }

  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;

  return distance(point, { x: nearestX, y: nearestY }) <= threshold;
}

// Check if point is near any segment of a path (polyline)
export function pointNearPath(
  point: Point,
  pathPoints: Point[],
  threshold: number = 5
): boolean {
  if (pathPoints.length < 2) return false;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    if (pointNearLine(point, pathPoints[i], pathPoints[i + 1], threshold)) {
      return true;
    }
  }

  return false;
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Calculate control points for a cubic bezier curve based on anchor positions
export function getCurvedPath(
  x1: number, y1: number,
  x2: number, y2: number,
  sourceAnchor?: string,
  targetAnchor?: string
): string {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const offset = Math.min(dist * 0.5, 100);

  let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;

  switch (sourceAnchor) {
    case 'right': cx1 = x1 + offset; break;
    case 'left': cx1 = x1 - offset; break;
    case 'bottom': cy1 = y1 + offset; break;
    case 'top': cy1 = y1 - offset; break;
    default: cx1 = x1 + (x2 - x1) * 0.5;
  }

  switch (targetAnchor) {
    case 'right': cx2 = x2 + offset; break;
    case 'left': cx2 = x2 - offset; break;
    case 'bottom': cy2 = y2 + offset; break;
    case 'top': cy2 = y2 - offset; break;
    default: cx2 = x2 - (x2 - x1) * 0.5;
  }

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// Get the control points for a cubic bezier (for hit testing and arrow angle)
export function getCurvedControlPoints(
  x1: number, y1: number,
  x2: number, y2: number,
  sourceAnchor?: string,
  targetAnchor?: string
): { cx1: number; cy1: number; cx2: number; cy2: number } {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const offset = Math.min(dist * 0.5, 100);

  let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;

  switch (sourceAnchor) {
    case 'right': cx1 = x1 + offset; break;
    case 'left': cx1 = x1 - offset; break;
    case 'bottom': cy1 = y1 + offset; break;
    case 'top': cy1 = y1 - offset; break;
    default: cx1 = x1 + (x2 - x1) * 0.5;
  }

  switch (targetAnchor) {
    case 'right': cx2 = x2 + offset; break;
    case 'left': cx2 = x2 - offset; break;
    case 'bottom': cy2 = y2 + offset; break;
    case 'top': cy2 = y2 - offset; break;
    default: cx2 = x2 - (x2 - x1) * 0.5;
  }

  return { cx1, cy1, cx2, cy2 };
}

// Evaluate a point on a cubic bezier at parameter t
function cubicBezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Check if a point is near a cubic bezier curve
export function pointNearBezier(
  point: Point,
  start: Point,
  end: Point,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  threshold: number = 5
): boolean {
  // Sample the bezier curve and check distance to each segment
  const samples = 20;
  let prevX = start.x;
  let prevY = start.y;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = cubicBezierPoint(t, start.x, cx1, cx2, end.x);
    const y = cubicBezierPoint(t, start.y, cy1, cy2, end.y);

    if (pointNearLine(point, { x: prevX, y: prevY }, { x, y }, threshold)) {
      return true;
    }

    prevX = x;
    prevY = y;
  }

  return false;
}
