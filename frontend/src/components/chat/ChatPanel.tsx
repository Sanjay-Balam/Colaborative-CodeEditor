'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Code, Paperclip, Smile, X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { useChatMessages } from '@/hooks/useChatMessages';

interface ChatPanelProps {
  documentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  isVisible: boolean;
  onToggle: () => void;
}

export default function ChatPanel({
  documentId,
  userId,
  userName,
  userAvatar,
  collaborators,
  isVisible,
  onToggle
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    isConnected
  } = useChatMessages(documentId, userId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Send typing indicator
    sendTypingIndicator(true, 'chat');
    
    // Handle mentions
    const lastAtSymbol = value.lastIndexOf('@');
    if (lastAtSymbol !== -1 && lastAtSymbol === value.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAtSymbol !== -1 && value.slice(lastAtSymbol).includes(' ')) {
      setShowMentions(false);
    } else if (lastAtSymbol !== -1) {
      const query = value.slice(lastAtSymbol + 1);
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (collaborator: any) => {
    const lastAtSymbol = message.lastIndexOf('@');
    const newMessage = message.slice(0, lastAtSymbol) + `@${collaborator.name} `;
    setMessage(newMessage);
    setSelectedMentions([...selectedMentions, collaborator.id]);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const messageData = {
      content: message,
      messageType: isCodeMode ? 'code' : 'text',
      codeSnippet: isCodeMode ? {
        language: codeLanguage,
        code: message
      } : undefined,
      mentions: selectedMentions
    };

    await sendMessage(messageData);
    
    setMessage('');
    setSelectedMentions([]);
    setIsCodeMode(false);
    sendTypingIndicator(false, 'chat');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredCollaborators = collaborators.filter(c => 
    c.name.toLowerCase().includes(mentionQuery.toLowerCase()) && c.id !== userId
  );

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors z-40"
        title="Open Chat"
      >
        <User size={20} />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col z-30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <User size={20} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">Team Chat</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.user.id === userId}
            collaborators={collaborators}
          />
        ))}
        
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Mentions Dropdown */}
      {showMentions && filteredCollaborators.length > 0 && (
        <div className="border-t border-gray-200 bg-white max-h-32 overflow-y-auto">
          {filteredCollaborators.map((collaborator) => (
            <button
              key={collaborator.id}
              onClick={() => handleMentionSelect(collaborator)}
              className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                {collaborator.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">{collaborator.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <button
            onClick={() => setIsCodeMode(!isCodeMode)}
            className={`p-1 rounded ${isCodeMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Code Mode"
          >
            <Code size={16} />
          </button>
          
          {isCodeMode && (
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
            </select>
          )}
        </div>
        
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isCodeMode ? "Share code snippet..." : "Type a message... (@mention teammates)"}
              className={`w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isCodeMode ? 'font-mono text-sm' : ''
              }`}
              rows={isCodeMode ? 4 : 2}
              disabled={!isConnected}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        {selectedMentions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedMentions.map((mentionId) => {
              const collaborator = collaborators.find(c => c.id === mentionId);
              return collaborator ? (
                <span
                  key={mentionId}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  @{collaborator.name}
                  <button
                    onClick={() => setSelectedMentions(prev => prev.filter(id => id !== mentionId))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}