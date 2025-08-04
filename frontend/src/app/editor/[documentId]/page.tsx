'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import CollaborativeEditor from '@/components/editor/CollaborativeEditor';

export default function EditorPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  
  // Mock user data - in real app this would come from authentication
  const [user, setUser] = useState({
    id: '',
    name: '',
    email: '',
    avatar: ''
  });

  useEffect(() => {
    // Simulate getting user data from auth
    const mockUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      name: `User ${Math.floor(Math.random() * 1000)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
    };
    setUser(mockUser);
  }, []);

  if (!user.id) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      documentId={documentId}
      userId={user.id}
      userName={user.name}
      userEmail={user.email}
      userAvatar={user.avatar}
      language="javascript"
      theme="vs-dark"
      readOnly={false}
    />
  );
}