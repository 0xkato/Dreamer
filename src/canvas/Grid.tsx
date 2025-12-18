import { useCanvasStore } from '../store';

export function Grid() {
  const { viewport } = useCanvasStore();

  // Adjust grid size based on zoom level
  const baseGridSize = 20;
  let gridSize = baseGridSize;

  if (viewport.zoom < 0.5) {
    gridSize = baseGridSize * 4;
  } else if (viewport.zoom < 1) {
    gridSize = baseGridSize * 2;
  }

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        top: -10000,
        left: -10000,
        width: 20000,
        height: 20000,
      }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={1 / viewport.zoom}
          />
        </pattern>
        <pattern
          id="grid-pattern-large"
          width={gridSize * 5}
          height={gridSize * 5}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={gridSize * 5}
            height={gridSize * 5}
            fill="url(#grid-pattern)"
          />
          <path
            d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1 / viewport.zoom}
          />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#grid-pattern-large)"
      />
    </svg>
  );
}
