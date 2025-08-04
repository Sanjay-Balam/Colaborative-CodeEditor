'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ChatMessage {
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
}

interface TypingUser {
  id: string;
  name: string;
}

interface MessageData {
  content: string;
  messageType?: 'text' | 'code';
  codeSnippet?: {
    language: string;
    code: string;
  };
  mentions?: string[];
}

export function useChatMessages(documentId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/messages/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, [documentId]);

  // WebSocket connection
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/collaborate';
    const ws = new WebSocket(`${wsUrl}?documentId=${documentId}&userId=${userId}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      setWsConnection(ws);
      console.log('Chat WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setWsConnection(null);
      console.log('Chat WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            setMessages(prev => [...prev, {
              id: data.id,
              user: data.user,
              message: data.message,
              messageType: data.messageType,
              codeSnippet: data.codeSnippet,
              mentions: data.mentions || [],
              createdAt: data.createdAt
            }]);
            break;
            
          case 'typing_indicator':
            if (data.location === 'chat' && data.userId !== userId) {
              setTypingUsers(prev => {
                const filtered = prev.filter(user => user.id !== data.userId);
                if (data.isTyping) {
                  return [...filtered, { id: data.userId, name: data.userName || 'Unknown' }];
                }
                return filtered;
              });
              
              // Clear typing indicator after timeout
              if (data.isTyping) {
                setTimeout(() => {
                  setTypingUsers(prev => prev.filter(user => user.id !== data.userId));
                }, 3000);
              }
            }
            break;
            
          case 'connection-established':
            console.log('Chat connection established:', data.connectionId);
            loadMessages();
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [documentId, userId, loadMessages]);

  const sendMessage = useCallback(async (messageData: MessageData) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      wsConnection.send(JSON.stringify({
        type: 'chat_message',
        ...messageData
      }));
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }, [wsConnection]);

  const sendTypingIndicator = useCallback((isTyping: boolean, location: 'chat' | 'code' = 'chat') => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      wsConnection.send(JSON.stringify({
        type: 'typing_indicator',
        isTyping,
        location
      }));

      // Auto-stop typing indicator after 2 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          wsConnection.send(JSON.stringify({
            type: 'typing_indicator',
            isTyping: false,
            location
          }));
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [wsConnection]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, []);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    sendTypingIndicator,
    deleteMessage,
    loadMessages
  };
}