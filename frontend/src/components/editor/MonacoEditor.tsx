'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { CollaborationManager } from '@/lib/yjs-setup';

interface MonacoEditorProps {
  documentId: string;
  userId: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

export default function MonacoEditor({
  documentId,
  userId,
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false,
  onEditorMount
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const collaborationRef = useRef<CollaborationManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    if (onEditorMount) {
      onEditorMount(editor);
    }

    setupCollaboration(editor);
  };

  const setupCollaboration = (editor: editor.IStandaloneCodeEditor) => {
    if (!documentId || !userId) return;

    const collaborationManager = new CollaborationManager(documentId, userId);
    collaborationRef.current = collaborationManager;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002/collaborate';
    
    try {
      const { provider, awareness } = collaborationManager.connect(editor, wsUrl);
      
      provider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });

      awareness.on('change', () => {
        const states = awareness.getStates();
        console.log('Awareness states updated:', states.size, 'users online');
      });

    } catch (error) {
      console.error('Failed to setup collaboration:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (collaborationRef.current) {
        collaborationRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-2 right-2 z-10">
        <div className={`px-2 py-1 rounded text-xs ${
          isConnected 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <Editor
        height="100%"
        language={language}
        theme={theme}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
}