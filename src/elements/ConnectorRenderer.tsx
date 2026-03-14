import type { ConnectorElement, CanvasElement } from '../types';
import { getAnchorPoints, getCurvedPath, getCurvedControlPoints } from '../utils/geometry';

interface ConnectorRendererProps {
  connector: ConnectorElement;
  elements: CanvasElement[];
  isSelected: boolean;
}

export function ConnectorRenderer({ connector, elements, isSelected }: ConnectorRendererProps) {
  const source = elements.find((e) => e.id === connector.sourceId);
  const target = elements.find((e) => e.id === connector.targetId);

  if (!source || !target) return null;

  const sourceAnchors = getAnchorPoints(source);
  const targetAnchors = getAnchorPoints(target);

  const start = sourceAnchors[connector.sourceAnchor];
  const end = targetAnchors[connector.targetAnchor];

  const { style } = connector;
  const isCurved = connector.curveStyle === 'curved';

  // Create arrow marker ID based on connector style
  const markerId = `arrow-${connector.id}`;
  const markerStartId = `arrow-start-${connector.id}`;

  // Calculate arrow head size
  const arrowSize = style.strokeWidth * 3;

  // For curved connectors, calculate the tangent angle at the endpoints
  // to orient the arrowheads correctly
  let endMarkerOrient: string = 'auto';
  let startMarkerOrient: string = 'auto-start-reverse';

  if (isCurved) {
    const cp = getCurvedControlPoints(
      start.x, start.y, end.x, end.y,
      connector.sourceAnchor, connector.targetAnchor
    );

    // Tangent at end: direction from control point 2 to end point
    const endAngle = Math.atan2(end.y - cp.cy2, end.x - cp.cx2) * (180 / Math.PI);
    endMarkerOrient = `${endAngle}`;

    // Tangent at start: direction from start point to control point 1
    const startAngle = Math.atan2(start.y - cp.cy1, start.x - cp.cx1) * (180 / Math.PI);
    startMarkerOrient = `${startAngle}`;
  }

  // Build the path string
  const pathD = isCurved
    ? getCurvedPath(start.x, start.y, end.x, end.y, connector.sourceAnchor, connector.targetAnchor)
    : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  return (
    <g>
      {/* Arrow marker definitions */}
      <defs>
        {style.arrowEnd && (
          <marker
            id={markerId}
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize - 1}
            refY={arrowSize / 2}
            orient={endMarkerOrient}
          >
            <path
              d={`M 0 0 L ${arrowSize} ${arrowSize / 2} L 0 ${arrowSize} Z`}
              fill={style.strokeColor}
            />
          </marker>
        )}
        {style.arrowStart && (
          <marker
            id={markerStartId}
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={1}
            refY={arrowSize / 2}
            orient={startMarkerOrient}
          >
            <path
              d={`M ${arrowSize} 0 L 0 ${arrowSize / 2} L ${arrowSize} ${arrowSize} Z`}
              fill={style.strokeColor}
            />
          </marker>
        )}
      </defs>

      {/* Selection highlight (wider hit area) */}
      {isSelected && (
        <path
          d={pathD}
          stroke="#3b82f6"
          strokeWidth={style.strokeWidth + 4}
          strokeOpacity={0.3}
          fill="none"
        />
      )}

      {/* Main line/curve */}
      <path
        d={pathD}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.lineStyle === 'dashed' ? '8 4' : undefined}
        fill="none"
        markerEnd={style.arrowEnd ? `url(#${markerId})` : undefined}
        markerStart={style.arrowStart ? `url(#${markerStartId})` : undefined}
      />

      {/* Endpoint indicators when selected */}
      {isSelected && (
        <>
          <circle
            cx={start.x}
            cy={start.y}
            r={4}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
          />
          <circle
            cx={end.x}
            cy={end.y}
            r={4}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
          />
        </>
      )}
    </g>
  );
}
