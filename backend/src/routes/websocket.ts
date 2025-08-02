import { Elysia, t } from 'elysia';
import { CollaborationService } from '../services/CollaborationService';

const collaborationService = new CollaborationService();

export const websocketRoutes = new Elysia()
  .ws('/collaborate', {
    
    async open(ws) {
      const { documentId, userId } = ws.data.query;
      
      try {
        const connectionId = await collaborationService.handleConnection(
          ws, 
          documentId, 
          userId
        );
        
        // Store connection ID in websocket data for cleanup
        ws.data.connectionId = connectionId;
        
        console.log(`User connected to document ${documentId}:`, connectionId);
        
        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connection-established',
          connectionId,
          documentId
        }));
        
      } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        ws.close();
      }
    },

    async message(ws, message) {
      // Y.js handles binary messages automatically through the collaboration service
      // The message handling is done in CollaborationService.setupMessageHandlers
    },

    async close(ws) {
      const connectionId = ws.data.connectionId;
      
      if (connectionId) {
        await collaborationService.handleDisconnection(connectionId);
        console.log('User disconnected:', connectionId);
      }
    }
  })
  
  // REST endpoint to get document collaboration info
  .get('/api/documents/:documentId/sessions', async ({ params }) => {
    try {
      const sessions = await collaborationService.getDocumentSessions(params.documentId);
      const activeConnections = collaborationService.getActiveConnections(params.documentId);
      
      return {
        activeConnections,
        sessions: sessions.map(session => ({
          userId: session.userId,
          joinedAt: session.joinedAt,
          cursor: session.cursor
        }))
      };
    } catch (error) {
      console.error('Error getting document sessions:', error);
      return { error: 'Failed to get document sessions' };
    }
  });