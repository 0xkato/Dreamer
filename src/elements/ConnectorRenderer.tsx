import type { ConnectorElement, CanvasElement } from '../types';
import { getAnchorPoints } from '../utils/geometry';

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

  // Create arrow marker ID based on connector style
  const markerId = `arrow-${connector.id}`;

  // Calculate arrow head size
  const arrowSize = style.strokeWidth * 3;

  return (
    <g>
      {/* Arrow marker definition */}
      {style.arrowEnd && (
        <defs>
          <marker
            id={markerId}
            markerWidth={arrowSize}
            markerHeight={arrowSize}
            refX={arrowSize - 1}
            refY={arrowSize / 2}
            orient="auto"
          >
            <path
              d={`M 0 0 L ${arrowSize} ${arrowSize / 2} L 0 ${arrowSize} Z`}
              fill={style.strokeColor}
            />
          </marker>
        </defs>
      )}

      {/* Selection highlight (wider hit area) */}
      {isSelected && (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#3b82f6"
          strokeWidth={style.strokeWidth + 4}
          strokeOpacity={0.3}
        />
      )}

      {/* Main line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={style.strokeColor}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.lineStyle === 'dashed' ? '8 4' : undefined}
        markerEnd={style.arrowEnd ? `url(#${markerId})` : undefined}
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
