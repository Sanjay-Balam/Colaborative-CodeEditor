'use client';

import { useState, useEffect, useCallback } from 'react';

interface CodeComment {
  id: string;
  documentId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  lineNumber: number;
  comment: string;
  isResolved: boolean;
  resolvedBy?: {
    id: string;
    name: string;
  };
  resolvedAt?: string;
  replies: Array<{
    userId: {
      id: string;
      name: string;
    };
    comment: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export function useCodeComments(documentId: string, userId: string) {
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Load initial comments
  const loadComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comments/document/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [documentId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002/collaborate';
    const ws = new WebSocket(`${wsUrl}?documentId=${documentId}&userId=${userId}`);
    
    ws.onopen = () => {
      setIsConnected(true);
      setWsConnection(ws);
      console.log('Comments WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setWsConnection(null);
      console.log('Comments WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Comments WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'code_comment':
            if (data.action === 'created') {
              setComments(prev => [data.comment, ...prev]);
            } else if (data.action === 'resolved') {
              setComments(prev => 
                prev.map(comment => 
                  comment.id === data.comment.id 
                    ? { ...comment, isResolved: true, resolvedBy: data.comment.resolvedBy, resolvedAt: data.comment.resolvedAt }
                    : comment
                )
              );
            } else if (data.action === 'reply_added') {
              setComments(prev => 
                prev.map(comment => 
                  comment.id === data.commentId 
                    ? { ...comment, replies: [...comment.replies, data.reply] }
                    : comment
                )
              );
            }
            break;
            
          case 'connection-established':
            console.log('Comments connection established:', data.connectionId);
            loadComments();
            break;
        }
      } catch (error) {
        console.error('Error parsing comments WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [documentId, userId, loadComments]);

  const addComment = useCallback(async (lineNumber: number, comment: string) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      wsConnection.send(JSON.stringify({
        type: 'code_comment',
        action: 'create',
        lineNumber,
        comment
      }));
    } catch (error) {
      console.error('Error sending comment:', error);
    }
  }, [wsConnection]);

  const addReply = useCallback(async (commentId: string, replyText: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment: replyText })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { ...comment, replies: [...comment.replies, data.reply] }
              : comment
          )
        );
        
        // Also broadcast via WebSocket
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'code_comment',
            action: 'reply_added',
            commentId,
            reply: data.reply
          }));
        }
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  }, [wsConnection]);

  const resolveComment = useCallback(async (commentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { ...comment, isResolved: true, resolvedBy: data.comment.resolvedBy, resolvedAt: data.comment.resolvedAt }
              : comment
          )
        );
        
        // Also broadcast via WebSocket
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'code_comment',
            action: 'resolved',
            comment: data.comment
          }));
        }
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  }, [wsConnection]);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return {
    comments,
    isConnected,
    addComment,
    addReply,
    resolveComment,
    loadComments
  };
}