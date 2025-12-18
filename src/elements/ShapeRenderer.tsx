import { useState, useRef, useEffect } from 'react';
import type { ShapeElement } from '../types';
import { useElementsStore } from '../store';

interface ShapeRendererProps {
  element: ShapeElement;
  isSelected: boolean;
}

export function ShapeRenderer({ element }: ShapeRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { updateElement, pushHistory } = useElementsStore();
  const { id, x, y, width, height, shapeType, style, text, textStyle } = element;

  // Select all text when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateElement(id, { text: e.target.value });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    pushHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      pushHistory();
    }
  };

  // Build shape path
  const renderShape = () => {
    const commonProps = {
      fill: style.fillColor,
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth,
      filter: style.shadow ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))' : undefined,
    };

    switch (shapeType) {
      case 'rectangle':
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            {...commonProps}
          />
        );

      case 'roundedRectangle':
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={style.borderRadius || 8}
            ry={style.borderRadius || 8}
            {...commonProps}
          />
        );

      case 'ellipse':
        return (
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={width / 2}
            ry={height / 2}
            {...commonProps}
          />
        );

      default:
        return null;
    }
  };

  // Calculate font style
  const fontStyle = [
    textStyle.italic ? 'italic' : 'normal',
    textStyle.bold ? 'bold' : 'normal',
    `${textStyle.fontSize}px`,
    textStyle.fontFamily,
  ].join(' ');

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width,
        height,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Shape SVG */}
      <svg
        width={width}
        height={height}
        className="absolute top-0 left-0"
      >
        {renderShape()}
      </svg>

      {/* Text content */}
      {isEditing ? (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <textarea
            ref={textareaRef}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-center"
            style={{
              font: fontStyle,
              color: textStyle.color,
            }}
            value={text}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none p-2"
          style={{
            font: fontStyle,
            color: textStyle.color,
            textAlign: textStyle.align,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
