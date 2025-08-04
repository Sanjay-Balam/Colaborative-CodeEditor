'use client';

import { useEffect, useState } from 'react';

interface CursorData {
  userId: string;
  userName: string;
  color: string;
  position: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

interface FloatingCursorsProps {
  cursors: CursorData[];
  editorRef: React.RefObject<any>;
}

export default function FloatingCursors({ cursors, editorRef }: FloatingCursorsProps) {
  const [cursorElements, setCursorElements] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (!editorRef.current || cursors.length === 0) {
      setCursorElements([]);
      return;
    }

    const editor = editorRef.current;
    const elements: JSX.Element[] = [];

    cursors.forEach((cursor) => {
      // Get the position of the cursor in the editor
      const position = editor.getModel()?.getPositionAt(
        editor.getModel()?.getOffsetAt({
          lineNumber: cursor.position.line + 1,
          column: cursor.position.column + 1
        }) || 0
      );

      if (position) {
        // Get the screen coordinates
        const coords = editor.getScrolledVisiblePosition(position);
        
        if (coords) {
          // Cursor element
          elements.push(
            <div
              key={`cursor-${cursor.userId}`}
              className="absolute pointer-events-none z-50"
              style={{
                left: coords.left,
                top: coords.top,
                transform: 'translateX(-1px)',
              }}
            >
              {/* Cursor line */}
              <div
                className="w-0.5 h-5 animate-pulse"
                style={{ backgroundColor: cursor.color }}
              />
              
              {/* User label */}
              <div
                className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap shadow-lg"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </div>
          );
        }
      }

      // Selection highlight
      if (cursor.selection) {
        const startPos = {
          lineNumber: cursor.selection.startLine + 1,
          column: cursor.selection.startColumn + 1
        };
        const endPos = {
          lineNumber: cursor.selection.endLine + 1,
          column: cursor.selection.endColumn + 1
        };

        // Add selection decoration to the editor
        const decorationIds = editor.deltaDecorations([], [
          {
            range: {
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column
            },
            options: {
              className: `user-selection-${cursor.userId.replace(/[^a-zA-Z0-9]/g, '')}`,
              stickiness: 1,
              isWholeLine: false,
              inlineClassName: 'user-selection-inline'
            }
          }
        ]);

        // Add CSS for the selection
        const style = document.createElement('style');
        style.textContent = `
          .user-selection-${cursor.userId.replace(/[^a-zA-Z0-9]/g, '')} {
            background-color: ${cursor.color}33 !important;
            border: 1px solid ${cursor.color}66;
          }
          .user-selection-inline {
            background-color: ${cursor.color}22 !important;
          }
        `;
        document.head.appendChild(style);

        // Clean up decorations after some time
        setTimeout(() => {
          editor.deltaDecorations(decorationIds, []);
          document.head.removeChild(style);
        }, 5000);
      }
    });

    setCursorElements(elements);
  }, [cursors, editorRef]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {cursorElements}
    </div>
  );
}