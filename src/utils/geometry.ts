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
