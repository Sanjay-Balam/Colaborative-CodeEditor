import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { Types } from 'mongoose';
import crypto from 'crypto';

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-editor';

async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: false },
  yjsState: { type: Buffer },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

// Session Schema
const sessionSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  socketId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  cursor: {
    line: { type: Number, default: 0 },
    column: { type: Number, default: 0 }
  },
  joinedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);

// Invitation Schema
const invitationSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientEmail: { type: String, required: true },
  inviteToken: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
});

const Invitation = mongoose.model('Invitation', invitationSchema);

// Auth utilities
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Auth middleware
const authMiddleware = new Elysia()
  .derive(async ({ headers }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return { user: null };
    }

    try {
      const user = await User.findById(payload.userId).select('-passwordHash');
      return { user };
    } catch (error) {
      console.error('Error finding user:', error);
      return { user: null };
    }
  });

const requireAuth = new Elysia()
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Authentication required' };
    }
  });

// Y.js Service
class YjsService {
  private documents = new Map<string, Y.Doc>();

  async getOrCreateDocument(documentId: string): Promise<Y.Doc> {
    let ydoc = this.documents.get(documentId);
    
    if (!ydoc) {
      ydoc = new Y.Doc();
      this.documents.set(documentId, ydoc);
      
      try {
        const doc = await Document.findById(documentId);
        if (doc && doc.yjsState) {
          Y.applyUpdate(ydoc, doc.yjsState);
        }
      } catch (error) {
        console.error('Error loading document state:', error);
      }
    }
    
    return ydoc;
  }

  async saveDocument(documentId: string, ydoc: Y.Doc): Promise<void> {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      const text = ydoc.getText('monaco').toString();
      
      await Document.findByIdAndUpdate(
        documentId,
        {
          yjsState: state,
          content: text,
          updatedAt: new Date()
        },
        { upsert: false }
      );
    } catch (error) {
      console.error('Error saving document state:', error);
    }
  }

  async createDocument(title: string, language: string, ownerId: string): Promise<string> {
    try {
      const doc = new Document({
        title,
        language,
        content: '',
        owner: new Types.ObjectId(ownerId),
        collaborators: [],
        isPublic: false
      });
      
      await doc.save();
      
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText('monaco');
      ytext.insert(0, '// Welcome to the collaborative editor!\n// Start typing to see real-time collaboration in action.\n\n');
      
      const state = Y.encodeStateAsUpdate(ydoc);
      doc.yjsState = state;
      doc.content = ytext.toString();
      await doc.save();
      
      this.documents.set(doc._id.toString(), ydoc);
      
      return doc._id.toString();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  removeDocument(documentId: string): void {
    this.documents.delete(documentId);
  }
}

// Collaboration Service
interface WebSocketConnection {
  ws: any;
  documentId: string;
  userId?: string;
  sessionId?: string;
}

class CollaborationService {
  private yjsService: YjsService;
  private connections = new Map<string, WebSocketConnection>();
  private documentConnections = new Map<string, Set<string>>();
  private awarenessMap = new Map<string, awarenessProtocol.Awareness>();

  constructor() {
    this.yjsService = new YjsService();
  }

  async handleConnection(ws: any, documentId: string, userId?: string): Promise<string> {
    const connectionId = this.generateConnectionId();
    
    const ydoc = await this.yjsService.getOrCreateDocument(documentId);
    
    let awareness = this.awarenessMap.get(documentId);
    if (!awareness) {
      awareness = new awarenessProtocol.Awareness(ydoc);
      this.awarenessMap.set(documentId, awareness);
    }

    const connection: WebSocketConnection = {
      ws,
      documentId,
      userId
    };
    this.connections.set(connectionId, connection);

    if (!this.documentConnections.has(documentId)) {
      this.documentConnections.set(documentId, new Set());
    }
    this.documentConnections.get(documentId)!.add(connectionId);

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

    this.setupMessageHandlers(ws, connectionId, ydoc, awareness);
    this.sendInitialSync(ws, ydoc);

    return connectionId;
  }

  private setupMessageHandlers(ws: any, connectionId: string, ydoc: Y.Doc, awareness: awarenessProtocol.Awareness) {
    ws.on('message', async (message: Buffer) => {
      try {
        const data = new Uint8Array(message);
        
        // Handle sync messages (Y.js protocol)
        if (data[0] < 3) {
          try {
            (syncProtocol as any).readSyncMessage(data, ydoc, ws);
            this.broadcastToDocument(connectionId, message);
            
            this.yjsService.saveDocument(
              this.connections.get(connectionId)!.documentId, 
              ydoc
            );
          } catch (syncError) {
            console.error('Sync protocol error:', syncError);
          }
        }
        // Handle awareness messages
        else {
          try {
            (awarenessProtocol as any).applyAwarenessUpdate(awareness, data.slice(1), null);
            this.broadcastToDocument(connectionId, message);
          } catch (awarenessError) {
            console.error('Awareness protocol error:', awarenessError);
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    awareness.on('update', ({ added, updated, removed }: any) => {
      const changedClients = added.concat(updated, removed);
      if (changedClients.length > 0) {
        try {
          const awarenessUpdate = (awarenessProtocol as any).encodeAwarenessUpdate(awareness, changedClients);
          this.broadcastToDocument(connectionId, awarenessUpdate, true);
        } catch (error) {
          console.error('Error encoding awareness update:', error);
        }
      }
    });
  }

  private sendInitialSync(ws: any, ydoc: Y.Doc) {
    try {
      const syncMessage = (syncProtocol as any).encodeSyncStep1(ydoc);
      ws.send(syncMessage);
    } catch (error) {
      console.error('Error sending initial sync:', error);
    }
  }

  private broadcastToDocument(senderConnectionId: string, message: Buffer | Uint8Array, isAwareness = false) {
    const connection = this.connections.get(senderConnectionId);
    if (!connection) return;

    const documentConnections = this.documentConnections.get(connection.documentId);
    if (!documentConnections) return;

    documentConnections.forEach(connId => {
      if (connId !== senderConnectionId) {
        const conn = this.connections.get(connId);
        if (conn && conn.ws.readyState === 1) {
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

    const documentConnections = this.documentConnections.get(connection.documentId);
    if (documentConnections) {
      documentConnections.delete(connectionId);
      
      if (documentConnections.size === 0) {
        this.documentConnections.delete(connection.documentId);
        
        const ydoc = await this.yjsService.getOrCreateDocument(connection.documentId);
        await this.yjsService.saveDocument(connection.documentId, ydoc);
      }
    }

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

// Invitation Service
class InvitationService {
  
  async createInvitation(documentId: string, senderId: string, recipientEmail: string) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const isOwner = document.owner.toString() === senderId;
    const isCollaborator = document.collaborators.some(c => c.toString() === senderId);
    
    if (!isOwner && !isCollaborator) {
      throw new Error('You do not have permission to invite users to this document');
    }

    const existingInvitation = await Invitation.findOne({
      documentId: new Types.ObjectId(documentId),
      recipientEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email');
    }

    const recipientUser = await User.findOne({ email: recipientEmail });
    if (recipientUser) {
      const isAlreadyCollaborator = document.collaborators.some(
        c => c.toString() === recipientUser._id.toString()
      );
      if (isAlreadyCollaborator || document.owner.toString() === recipientUser._id.toString()) {
        throw new Error('User is already a collaborator on this document');
      }
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');

    const invitation = new Invitation({
      documentId: new Types.ObjectId(documentId),
      senderId: new Types.ObjectId(senderId),
      recipientEmail,
      recipientId: recipientUser?._id || null,
      inviteToken,
      status: 'pending'
    });

    await invitation.save();
    
    await invitation.populate('senderId', 'name email');
    await invitation.populate('documentId', 'title language');

    return invitation;
  }

  async acceptInvitation(inviteToken: string, userId?: string) {
    const invitation = await Invitation.findOne({
      inviteToken,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('documentId');

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    let recipientId = invitation.recipientId;

    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.email !== invitation.recipientEmail) {
        throw new Error('This invitation is not for your email address');
      }

      recipientId = user._id;
    } else {
      const user = await User.findOne({ email: invitation.recipientEmail });
      if (user) {
        recipientId = user._id;
      } else {
        throw new Error('User must be registered to accept invitation');
      }
    }

    await Document.findByIdAndUpdate(
      invitation.documentId._id,
      { $addToSet: { collaborators: recipientId } }
    );

    invitation.status = 'accepted';
    invitation.recipientId = recipientId;
    await invitation.save();

    return invitation;
  }

  generateInviteLink(inviteToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/invite/${inviteToken}`;
  }
}

// Initialize services
const collaborationService = new CollaborationService();
const yjsService = new YjsService();
const invitationService = new InvitationService();

// Create Elysia app with all routes and connections
const app = new Elysia()
  .use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }))
  .use(websocket())

  // WebSocket routes
  .ws('/collaborate', {
    async open(ws) {
      const { documentId, userId } = ws.data.query as { documentId: string, userId: string };
      
      try {
        const connectionId = await collaborationService.handleConnection(
          ws, 
          documentId, 
          userId
        );
        
        ws.data.connectionId = connectionId as string;1
        
        console.log(`User connected to document ${documentId}:`, connectionId);
        
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
    },

    async close(ws) {
      const connectionId = ws.data.connectionId as string;
      
      if (connectionId) {
        await collaborationService.handleDisconnection(connectionId);
        console.log('User disconnected:', connectionId);
      }
    }
  })

  // Document collaboration info endpoint
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
  })

  // Auth routes
  .group('/api/auth', (app) => app
    .post('/register', async ({ body, set }) => {
      try {
        const { email, name, password } = body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          set.status = 400;
          return { error: 'User already exists with this email' };
        }

        const passwordHash = await hashPassword(password);

        const user = new User({
          email,
          name,
          passwordHash
        });

        await user.save();

        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
          name: user.name
        });

        return {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            createdAt: user.createdAt
          },
          token
        };
      } catch (error) {
        console.error('Registration error:', error);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    }, {
      body: t.Object({
        email: t.String(),
        name: t.String(),
        password: t.String()
      })
    })

    .post('/login', async ({ body, set }) => {
      try {
        const { email, password } = body;

        const user = await User.findOne({ email });
        if (!user) {
          set.status = 401;
          return { error: 'Invalid email or password' };
        }

        const isValidPassword = await comparePassword(password, user.passwordHash);
        if (!isValidPassword) {
          set.status = 401;
          return { error: 'Invalid email or password' };
        }

        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
          name: user.name
        });

        return {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            createdAt: user.createdAt
          },
          token
        };
      } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return { error: 'Internal server error' };
      }
    }, {
      body: t.Object({
        email: t.String(),
        password: t.String()
      })
    })

    .use(authMiddleware)
    .get('/me', ({ user, set }: { user: any, set: any }) => {
      if (!user) {
        set.status = 401;
        return { error: 'Authentication required' };
      }

      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      };
    })
  )

  // Document routes
  .group('/api/documents', (app) => app
    .use(requireAuth)
    .get('/', async ({ user }: { user: any }) => {
      try {
        const documents = await Document.find({
          $or: [
            { owner: user._id },
            { collaborators: user._id },
            { isPublic: true }
          ]
        })
        .populate('owner', 'name email avatar')
        .populate('collaborators', 'name email avatar')
        .sort({ updatedAt: -1 });

        return { documents };
      } catch (error) {
        console.error('Error fetching documents:', error);
        return { error: 'Failed to fetch documents' };
      }
    })

    .post('/', async ({ user, body }: { user: any, body: any }) => {
      try {
        const documentId = await yjsService.createDocument(
          body.title,
          body.language,
          user._id.toString()
        );

        const document = await Document.findById(documentId)
          .populate('owner', 'name email avatar');

        return { document };
      } catch (error) {
        console.error('Error creating document:', error);
        return { error: 'Failed to create document' };
      }
    }, {
      body: t.Object({
        title: t.String(),
        language: t.Optional(t.String())
      })
    })

    .use(authMiddleware)
    .get('/:id', async ({ params, user, set }: { params: any, user: any, set: any }) => {
      try {
        const document = await Document.findById(params.id)
          .populate('owner', 'name email avatar')
          .populate('collaborators', 'name email avatar');

        if (!document) {
          set.status = 404;
          return { error: 'Document not found' };
        }

        const isOwner = user && document.owner._id.toString() === user._id.toString();
        const isCollaborator = user && document.collaborators.some(
          (c: any) => c._id.toString() === user._id.toString()
        );
        const canAccess = document.isPublic || isOwner || isCollaborator;

        if (!canAccess) {
          set.status = 403;
          return { error: 'Access denied' };
        }

        return { document };
      } catch (error) {
        console.error('Error fetching document:', error);
        set.status = 500;
        return { error: 'Failed to fetch document' };
      }
    })

    .use(requireAuth)
    .patch('/:id', async ({ params, user, body, set }: { params: any, user: any, body: any, set: any }) => {
      try {
        const document = await Document.findById(params.id);

        if (!document) {
          set.status = 404;
          return { error: 'Document not found' };
        }

        if (document.owner.toString() !== user._id.toString()) {
          set.status = 403;
          return { error: 'Only the owner can update document settings' };
        }

        const updatedDocument = await Document.findByIdAndUpdate(
          params.id,
          { ...body, updatedAt: new Date() },
          { new: true }
        ).populate('owner', 'name email avatar')
         .populate('collaborators', 'name email avatar');

        return { document: updatedDocument };
      } catch (error) {
        console.error('Error updating document:', error);
        set.status = 500;
        return { error: 'Failed to update document' };
      }
    }, {
      body: t.Object({
        title: t.Optional(t.String()),
        language: t.Optional(t.String()),
        isPublic: t.Optional(t.Boolean())
      })
    })

    .delete('/:id', async ({ params, user, set }: { params: any, user: any, set: any }) => {
      try {
        const document = await Document.findById(params.id);

        if (!document) {
          set.status = 404;
          return { error: 'Document not found' };
        }

        if (document.owner.toString() !== user._id.toString()) {
          set.status = 403;
          return { error: 'Only the owner can delete the document' };
        }

        await Document.findByIdAndDelete(params.id);
        yjsService.removeDocument(params.id);

        return { message: 'Document deleted successfully' };
      } catch (error) {
        console.error('Error deleting document:', error);
        set.status = 500;
        return { error: 'Failed to delete document' };
      }
    })
  )

  // Invitation routes
  .group('/api/invitations', (app) => app
    .use(requireAuth)
    .post('/send', async ({ user, body, set }: { user: any, body: any, set: any }) => {
      try {
        const { documentId, recipientEmail } = body;

        const invitation = await invitationService.createInvitation(
          documentId,
          user._id.toString(),
          recipientEmail
        );

        const inviteLink = invitationService.generateInviteLink(invitation.inviteToken);

        return {
          invitation: {
            id: invitation._id,
            documentId: invitation.documentId,
            recipientEmail: invitation.recipientEmail,
            status: invitation.status,
            createdAt: invitation.createdAt,
            expiresAt: invitation.expiresAt
          },
          inviteLink
        };
      } catch (error: any) {
        console.error('Error sending invitation:', error);
        set.status = 400;
        return { error: error.message || 'Failed to send invitation' };
      }
    }, {
      body: t.Object({
        documentId: t.String(),
        recipientEmail: t.String()
      })
    })

    .use(authMiddleware)
    .post('/accept/:token', async ({ params, user, set }: { params: any, user: any, set: any }  ) => {
      try {
        const invitation = await invitationService.acceptInvitation(
          params.token,
          user?._id.toString()
        );

        return {
          message: 'Invitation accepted successfully',
          document: invitation.documentId,
          redirectUrl: `/editor/${invitation.documentId._id}`
        };
      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        set.status = 400;
        return { error: error.message || 'Failed to accept invitation' };
      }
    })
  )
  
  // Health check endpoint
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  
  // Basic API info
  .get('/', () => ({
    name: 'Collaborative Code Editor API',
    version: '1.0.0',
    endpoints: {
      websocket: '/collaborate',
      health: '/health'
    }
  }));

// Connect to database and start server
async function startServer() {
  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
      console.log(`🔗 WebSocket endpoint: ws://localhost:${port}/collaborate`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();