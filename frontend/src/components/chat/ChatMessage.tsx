'use client';

import { useState } from 'react';
import { Copy, Check, Code, User, Trash2 } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    message: string;
    messageType: 'text' | 'code' | 'system';
    codeSnippet?: {
      language: string;
      code: string;
    };
    mentions: string[];
    createdAt: string;
    isEdited?: boolean;
  };
  isOwn: boolean;
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  onDelete?: (messageId: string) => void;
}

export default function ChatMessage({ 
  message, 
  isOwn, 
  collaborators,
  onDelete 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (message.codeSnippet) {
      await navigator.clipboard.writeText(message.codeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const renderMessageContent = () => {
    if (message.messageType === 'code' && message.codeSnippet) {
      return (
        <div className="mt-2">
          <div className="flex items-center justify-between bg-gray-800 text-white px-3 py-2 rounded-t-md">
            <div className="flex items-center space-x-2">
              <Code size={14} />
              <span className="text-xs font-medium">{message.codeSnippet.language}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="text-gray-300 hover:text-white transition-colors"
              title="Copy code"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-b-md overflow-x-auto text-sm">
            <code>{message.codeSnippet.code}</code>
          </pre>
        </div>
      );
    }

    // Handle mentions in text messages
    let content = message.message;
    message.mentions.forEach(mentionId => {
      const collaborator = collaborators.find(c => c.id === mentionId);
      if (collaborator) {
        const mentionRegex = new RegExp(`@${collaborator.name}`, 'g');
        content = content.replace(
          mentionRegex, 
          `<span class="bg-blue-100 text-blue-800 px-1 rounded">@${collaborator.name}</span>`
        );
      }
    });

    return (
      <p 
        className="text-sm text-gray-800 break-words"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-start space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            {message.user.avatar ? (
              <img
                src={message.user.avatar}
                alt={message.user.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <User size={12} className="text-gray-600" />
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            <div className={`relative px-3 py-2 rounded-lg ${
              isOwn 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {renderMessageContent()}
              
              {/* Message actions */}
              {isOwn && onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1 rounded-full transition-opacity"
                  title="Delete message"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
            
            {/* Message metadata */}
            <div className={`flex items-center mt-1 text-xs text-gray-500 space-x-2 ${
              isOwn ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <span className="font-medium">{message.user.name}</span>
              <span>•</span>
              <span>{formatTime(message.createdAt)}</span>
              {message.isEdited && (
                <>
                  <span>•</span>
                  <span className="italic">edited</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}