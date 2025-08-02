'use client';

import { useState, useEffect, useCallback } from 'react';
import { Awareness } from 'y-protocols/awareness';

interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export function useCollaboration(awareness: Awareness | null) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const updateUsersList = useCallback(() => {
    if (!awareness) return;

    const users: User[] = [];
    const states = awareness.getStates();

    states.forEach((state, clientId) => {
      if (state.user) {
        users.push({
          id: state.user.id,
          name: state.user.name || `User ${clientId}`,
          color: state.user.color,
          cursor: state.cursor
        });
      }
    });

    setConnectedUsers(users);
  }, [awareness]);

  useEffect(() => {
    if (!awareness) return;

    const handleAwarenessChange = () => {
      updateUsersList();
    };

    const handleConnectionChange = () => {
      setIsConnected(awareness.doc?.ws?.readyState === WebSocket.OPEN);
    };

    awareness.on('change', handleAwarenessChange);
    
    updateUsersList();

    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [awareness, updateUsersList]);

  const updateCursor = useCallback((line: number, column: number) => {
    if (awareness) {
      awareness.setLocalStateField('cursor', { line, column });
    }
  }, [awareness]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (awareness) {
      const currentUser = awareness.getLocalState()?.user || {};
      awareness.setLocalStateField('user', { ...currentUser, ...userData });
    }
  }, [awareness]);

  return {
    connectedUsers,
    isConnected,
    updateCursor,
    updateUser
  };
}