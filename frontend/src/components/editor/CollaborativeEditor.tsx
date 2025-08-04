'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, MessageCircle, Bell, Settings, Share2, Play } from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import ChatPanel from '../chat/ChatPanel';
import UserPresence from '../presence/UserPresence';
import FloatingCursors from '../presence/FloatingCursors';
import NotificationPanel from '../notifications/NotificationPanel';
import CodeComments from '../comments/CodeComments';
import InviteModal from './InviteModal';
import { useCollaboration } from '@/hooks/useCollaboration';
import { editor } from 'monaco-editor';

interface CollaborativeEditorProps {
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}

export default function CollaborativeEditor({
  documentId,
  userId,
  userName,
  userEmail,
  userAvatar,
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false
}: CollaborativeEditorProps) {
  const [activePanel, setActivePanel] = useState<'users' | 'chat' | 'comments' | 'notifications' | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | undefined>();
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [cursors, setCursors] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const awareness = useRef<any>(null);

  const { connectedUsers, isConnected, updateCursor, updateUser } = useCollaboration(awareness.current);

  // Update collaborators when connected users change
  useEffect(() => {
    setCollaborators(connectedUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      avatar: user.avatar,
      presence: {
        status: 'active',
        cursor: user.cursor,
        lastSeen: new Date().toISOString()
      },
      color: user.color
    })));

    // Update cursors for floating cursor display
    setCursors(connectedUsers
      .filter(user => user.id !== userId && user.cursor)
      .map(user => ({
        userId: user.id,
        userName: user.name,
        color: user.color,
        position: user.cursor
      }))
    );
  }, [connectedUsers, userId]);

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set up cursor tracking
    editor.onDidChangeCursorPosition((e) => {
      updateCursor(e.position.lineNumber - 1, e.position.column - 1);
    });

    // Set up line click for comments
    editor.onMouseDown((e) => {
      if (e.target.type === 6) { // Gutter margin click
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          setSelectedLine(lineNumber - 1);
          setActivePanel('comments');
        }
      }
    });

    // Set up user info
    updateUser({
      id: userId,
      name: userName,
      email: userEmail,
      avatar: userAvatar,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    });
  };

  const togglePanel = (panel: typeof activePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleUserSelect = (selectedUserId: string) => {
    const user = connectedUsers.find(u => u.id === selectedUserId);
    if (user && user.cursor && editorRef.current) {
      editorRef.current.setPosition({
        lineNumber: user.cursor.line + 1,
        column: user.cursor.column + 1
      });
      editorRef.current.focus();
    }
  };

  const handleRunCode = () => {
    // Placeholder for code execution
    console.log('Running code...');
  };

  const handleShareDocument = () => {
    setShowInviteModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">Collaborative Editor</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Action Buttons */}
          <button
            onClick={handleRunCode}
            className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <Play size={16} />
            <span>Run</span>
          </button>
          
          <button
            onClick={handleShareDocument}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>

          {/* Panel Toggle Buttons */}
          <div className="flex items-center space-x-1 border-l border-gray-200 pl-4">
            <button
              onClick={() => togglePanel('users')}
              className={`p-2 rounded hover:bg-gray-100 transition-colors relative ${
                activePanel === 'users' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Users"
            >
              <Users size={18} />
              {connectedUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {connectedUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => togglePanel('chat')}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                activePanel === 'chat' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Chat"
            >
              <MessageCircle size={18} />
            </button>

            <button
              onClick={() => togglePanel('comments')}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                activePanel === 'comments' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Comments"
            >
              <MessageCircle size={18} />
            </button>

            <button
              onClick={() => togglePanel('notifications')}
              className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                activePanel === 'notifications' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              title="Notifications"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        {activePanel && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="flex-1 overflow-hidden">
              {activePanel === 'users' && (
                <div className="p-4">
                  <UserPresence
                    users={collaborators}
                    currentUserId={userId}
                    onUserSelect={handleUserSelect}
                  />
                </div>
              )}
              
              {activePanel === 'comments' && (
                <CodeComments
                  documentId={documentId}
                  userId={userId}
                  userName={userName}
                  editorRef={editorRef}
                  selectedLine={selectedLine}
                  onLineSelect={setSelectedLine}
                />
              )}
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 relative">
          <MonacoEditor
            documentId={documentId}
            userId={userId}
            language={language}
            theme={theme}
            readOnly={readOnly}
            onEditorMount={handleEditorMount}
          />
          
          {/* Floating Cursors */}
          {editorRef.current && (
            <FloatingCursors
              cursors={cursors}
              editorRef={editorRef}
            />
          )}
        </div>
      </div>

      {/* Chat Panel (Floating) */}
      <ChatPanel
        documentId={documentId}
        userId={userId}
        userName={userName}
        userAvatar={userAvatar}
        collaborators={collaborators}
        isVisible={activePanel === 'chat'}
        onToggle={() => togglePanel('chat')}
      />

      {/* Notification Panel (Floating) */}
      <NotificationPanel
        userId={userId}
        isVisible={activePanel === 'notifications'}
        onToggle={() => togglePanel('notifications')}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        documentId={documentId}
        documentTitle="Collaborative Document"
      />
    </div>
  );
}