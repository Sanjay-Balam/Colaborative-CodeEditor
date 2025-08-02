import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { YjsService } from './YjsService';
import { Session } from '../models/Session';
import { Types } from 'mongoose';

export interface WebSocketConnection {
  ws: any;
  documentId: string;
  userId?: string;
  sessionId?: string;
}

export class CollaborationService {
  private yjsService: YjsService;
  private connections = new Map<string, WebSocketConnection>();
  private documentConnections = new Map<string, Set<string>>();
  private awarenessMap = new Map<string, awarenessProtocol.Awareness>();

  constructor() {
    this.yjsService = new YjsService();
  }

  async handleConnection(ws: any, documentId: string, userId?: string): Promise<string> {
    const connectionId = this.generateConnectionId();
    
    // Get or create Y.js document
    const ydoc = await this.yjsService.getOrCreateDocument(documentId);
    
    // Get or create awareness for this document
    let awareness = this.awarenessMap.get(documentId);
    if (!awareness) {
      awareness = new awarenessProtocol.Awareness(ydoc);
      this.awarenessMap.set(documentId, awareness);
    }

    // Store connection
    const connection: WebSocketConnection = {
      ws,
      documentId,
      userId
    };
    this.connections.set(connectionId, connection);

    // Add to document connections
    if (!this.documentConnections.has(documentId)) {
      this.documentConnections.set(documentId, new Set());
    }
    this.documentConnections.get(documentId)!.add(connectionId);

    // Create session record if user is authenticated
    if (userId) {
      try {
        const session = new Session({
          documentId: new Types.ObjectId(documentId),
          userId: new Types.ObjectId(userId),
          socketId: connectionId,
          isActive: true
        });
        await session.save();
        connection.sessionId = session._id.toString();
      } catch (error) {
        console.error('Error creating session:', error);
      }
    }

    // Setup message handlers
    this.setupMessageHandlers(ws, connectionId, ydoc, awareness);

    // Send initial sync
    this.sendInitialSync(ws, ydoc);

    return connectionId;
  }

  private setupMessageHandlers(ws: any, connectionId: string, ydoc: Y.Doc, awareness: awarenessProtocol.Awareness) {
    ws.on('message', async (message: Buffer) => {
      try {
        const data = new Uint8Array(message);
        
        // Handle Y.js sync protocol
        if (data[0] === syncProtocol.messageYjsSyncStep1 || 
            data[0] === syncProtocol.messageYjsSyncStep2 || 
            data[0] === syncProtocol.messageYjsUpdate) {
          
          syncProtocol.readSyncMessage(data, ydoc, ws);
          
          // Broadcast to other clients in the same document
          this.broadcastToDocument(connectionId, message);
          
          // Save document state periodically
          this.yjsService.saveDocument(
            this.connections.get(connectionId)!.documentId, 
            ydoc
          );
        }
        
        // Handle awareness protocol
        else if (data[0] === awarenessProtocol.messageAwareness) {
          awarenessProtocol.applyAwarenessUpdate(awareness, data.slice(1), ws);
          this.broadcastToDocument(connectionId, message);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Handle awareness changes
    awareness.on('update', ({ added, updated, removed }: any) => {
      const changedClients = added.concat(updated, removed);
      if (changedClients.length > 0) {
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
        this.broadcastToDocument(connectionId, awarenessUpdate, true);
      }
    });
  }

  private sendInitialSync(ws: any, ydoc: Y.Doc) {
    // Send initial document state
    const syncMessage = syncProtocol.encodeSyncStep1(ydoc);
    ws.send(syncMessage);
  }

  private broadcastToDocument(senderConnectionId: string, message: Buffer | Uint8Array, isAwareness = false) {
    const connection = this.connections.get(senderConnectionId);
    if (!connection) return;

    const documentConnections = this.documentConnections.get(connection.documentId);
    if (!documentConnections) return;

    documentConnections.forEach(connId => {
      if (connId !== senderConnectionId) {
        const conn = this.connections.get(connId);
        if (conn && conn.ws.readyState === 1) { // WebSocket.OPEN
          try {
            conn.ws.send(message);
          } catch (error) {
            console.error('Error broadcasting message:', error);
            this.handleDisconnection(connId);
          }
        }
      }
    });
  }

  async handleDisconnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from document connections
    const documentConnections = this.documentConnections.get(connection.documentId);
    if (documentConnections) {
      documentConnections.delete(connectionId);
      
      // Clean up empty document connection sets
      if (documentConnections.size === 0) {
        this.documentConnections.delete(connection.documentId);
        
        // Optionally clean up awareness and save final document state
        const ydoc = await this.yjsService.getOrCreateDocument(connection.documentId);
        await this.yjsService.saveDocument(connection.documentId, ydoc);
      }
    }

    // Update session as inactive
    if (connection.sessionId) {
      try {
        await Session.findByIdAndUpdate(connection.sessionId, {
          isActive: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating session:', error);
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getActiveConnections(documentId: string): number {
    return this.documentConnections.get(documentId)?.size || 0;
  }

  async getDocumentSessions(documentId: string) {
    try {
      return await Session.find({
        documentId: new Types.ObjectId(documentId),
        isActive: true
      }).populate('userId', 'name email avatar');
    } catch (error) {
      console.error('Error getting document sessions:', error);
      return [];
    }
  }
}