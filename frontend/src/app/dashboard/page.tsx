'use client';

import { useState } from 'react';
import Link from 'next/link';
import NotificationBell from '@/components/ui/NotificationBell';

interface Document {
  _id: string;
  title: string;
  language: string;
  updatedAt: string;
  owner: {
    name: string;
    email: string;
  };
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    language: 'javascript'
  });

  // Mock documents for now - in real app this would fetch from API
  const mockDocuments: Document[] = [
    {
      _id: 'doc1',
      title: 'My First Project',
      language: 'javascript',
      updatedAt: new Date().toISOString(),
      owner: { name: 'John Doe', email: 'john@example.com' }
    },
    {
      _id: 'doc2',
      title: 'Python Script',
      language: 'python',
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      owner: { name: 'Jane Smith', email: 'jane@example.com' }
    }
  ];

  const handleCreateDocument = async () => {
    // In real app, this would call the API
    console.log('Creating document:', newDocument);
    
    // For demo, just redirect to editor with mock document
    const mockId = 'demo-' + Math.random().toString(36).substr(2, 9);
    window.location.href = `/editor/${mockId}`;
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Collaborative Editor
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create and collaborate on code in real-time
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                New Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Document Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Document
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter document title..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={newDocument.language}
                    onChange={(e) => setNewDocument({ ...newDocument, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateDocument}
                  disabled={!newDocument.title.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewDocument({ title: '', language: 'javascript' });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDocuments.map((doc) => (
            <Link key={doc._id} href={`/editor/${doc._id}`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {doc.title}
                  </h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                    {doc.language}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  By {doc.owner.name}
                </p>
                
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
          
          {/* Empty State */}
          {mockDocuments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No documents yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first document</p>
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}