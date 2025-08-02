'use client';

import { useCollaboration } from '@/hooks/useCollaboration';
import { Awareness } from 'y-protocols/awareness';
import { useState } from 'react';

interface CollaboratorCursorsProps {
  awareness: Awareness | null;
}

export default function CollaboratorCursors({ awareness }: CollaboratorCursorsProps) {
  const { connectedUsers } = useCollaboration(awareness);
  const [showDetails, setShowDetails] = useState(false);

  if (!connectedUsers.length) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>Only you</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        className="flex items-center space-x-2 cursor-pointer"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {connectedUsers.length + 1} online
        </span>
        <div className="flex -space-x-2">
          {connectedUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-medium shadow-sm"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {connectedUsers.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-500 flex items-center justify-center text-white text-xs font-medium shadow-sm">
              +{connectedUsers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip with user details */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Active Collaborators ({connectedUsers.length + 1})
          </h3>
          
          {/* Current user */}
          <div className="flex items-center space-x-2 py-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              Y
            </div>
            <span className="text-sm text-gray-900 dark:text-white">You</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">(Owner)</span>
          </div>

          {/* Other users */}
          {connectedUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-2 py-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-900 dark:text-white">{user.name}</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Changes are synced in real-time across all users
            </p>
          </div>
        </div>
      )}
    </div>
  );
}