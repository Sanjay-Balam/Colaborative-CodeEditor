'use client';

import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import MonacoEditor from '@/components/editor/MonacoEditor';
import CollaboratorCursors from '@/components/editor/CollaboratorCursors';
import InviteModal from '@/components/editor/InviteModal';
import { Awareness } from 'y-protocols/awareness';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  
  // Mock user ID - in real app this would come from authentication
  const userId = 'user-' + Math.random().toString(36).substr(2, 9);

  const handleEditorMount = (editor: any) => {
    // This will be called when the editor mounts
    // We can access the awareness from the collaboration manager here
    console.log('Editor mounted for document:', documentId);
  };

  const handleInviteClick = () => {
    setIsInviteModalOpen(true);
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/editor/${documentId}`;
    navigator.clipboard.writeText(shareUrl);
    // You could show a toast notification here
    alert('Document link copied to clipboard!');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {documentTitle}
          </h1>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
            javascript
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Collaborators Display */}
          <CollaboratorCursors awareness={awareness} />
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareLink}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              title="Copy document link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>
            
            <button
              onClick={handleInviteClick}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              title="Invite collaborator"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Status Bar */}
      <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 dark:text-green-300">
            Real-time collaboration active
          </span>
          <span className="text-green-600 dark:text-green-400 text-xs">
            • All changes are automatically saved and synced
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MonacoEditor
          documentId={documentId}
          userId={userId}
          language="javascript"
          theme="vs-dark"
          onEditorMount={handleEditorMount}
        />
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        documentId={documentId}
        documentTitle={documentTitle}
      />
    </div>
  );
}