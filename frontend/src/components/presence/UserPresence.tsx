'use client';

import { useState, useEffect } from 'react';
import { User, Eye, Edit, Video, Mic, MicOff } from 'lucide-react';

interface UserPresenceProps {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    presence: {
      status: 'active' | 'idle' | 'away';
      cursor?: {
        line: number;
        column: number;
      };
      selection?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
      isTyping?: boolean;
      lastSeen: string;
    };
    color: string;
  }>;
  currentUserId: string;
  onUserSelect?: (userId: string) => void;
}

export default function UserPresence({ 
  users, 
  currentUserId, 
  onUserSelect 
}: UserPresenceProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'away': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'idle': return 'Idle';
      case 'away': return 'Away';
      default: return 'Unknown';
    }
  };

  const formatCursorPosition = (cursor?: { line: number; column: number }) => {
    if (!cursor) return 'No cursor';
    return `Line ${cursor.line + 1}, Col ${cursor.column + 1}`;
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Collaborators ({users.length})
      </h3>
      
      <div className="space-y-2">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const isExpanded = expandedUser === user.id;
          
          return (
            <div key={user.id} className="relative">
              <div
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isCurrentUser 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setExpandedUser(isExpanded ? null : user.id);
                  if (onUserSelect && !isCurrentUser) {
                    onUserSelect(user.id);
                  }
                }}
              >
                {/* Avatar with status indicator */}
                <div className="relative flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                      style={{ border: `2px solid ${user.color}` }}
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
                      style={{ border: `2px solid ${user.color}` }}
                    >
                      <User size={16} className="text-gray-600" />
                    </div>
                  )}
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    getStatusColor(user.presence.status)
                  }`} />
                  
                  {/* Typing indicator */}
                  {user.presence.isTyping && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
                      <Edit size={8} className="text-white m-0.5" />
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name} {isCurrentUser && '(You)'}
                    </p>
                    {user.presence.isTyping && (
                      <span className="text-xs text-blue-600 animate-pulse">typing...</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {getStatusText(user.presence.status)} • {formatLastSeen(user.presence.lastSeen)}
                  </p>
                </div>

                {/* Quick actions */}
                <div className="flex items-center space-x-1">
                  {user.presence.cursor && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Jump to user's cursor position
                        if (onUserSelect) onUserSelect(user.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Jump to cursor"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 ml-11 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{user.email}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Cursor:</span>
                    <span className="ml-2 text-gray-600">
                      {formatCursorPosition(user.presence.cursor)}
                    </span>
                  </div>
                  
                  {user.presence.selection && (
                    <div>
                      <span className="font-medium text-gray-700">Selection:</span>
                      <span className="ml-2 text-gray-600">
                        Line {user.presence.selection.startLine + 1}-{user.presence.selection.endLine + 1}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                    <button
                      className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Start voice call (placeholder)
                        console.log('Start voice call with', user.name);
                      }}
                    >
                      <Mic size={12} />
                      <span>Call</span>
                    </button>
                    
                    <button
                      className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Start video call (placeholder)
                        console.log('Start video call with', user.name);
                      }}
                    >
                      <Video size={12} />
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {users.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No other collaborators online
        </div>
      )}
    </div>
  );
}