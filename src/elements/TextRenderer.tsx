import { useState, useRef, useEffect } from 'react';
import type { TextElement } from '../types';
import { useElementsStore } from '../store';

interface TextRendererProps {
  element: TextElement;
  isSelected: boolean;
}

export function TextRenderer({ element, isSelected }: TextRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { updateElement, pushHistory } = useElementsStore();
  const { id, x, y, width, height, text, textStyle } = element;

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
        minHeight: height,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Subtle background when selected */}
      {isSelected && (
        <div
          className="absolute inset-0 bg-blue-50 border border-blue-200 rounded"
          style={{ opacity: 0.5 }}
        />
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent border-none outline-none resize-none overflow-hidden"
          style={{
            font: fontStyle,
            color: textStyle.color,
            textAlign: textStyle.align,
            minHeight: height,
          }}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div
          className="pointer-events-none"
          style={{
            font: fontStyle,
            color: textStyle.color,
            textAlign: textStyle.align,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: height,
          }}
        >
          {text || 'Text'}
        </div>
      )}
    </div>
  );
}
