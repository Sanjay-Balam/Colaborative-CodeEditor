import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import { connectToDatabase } from './utils/database';

const app = new Elysia()
  .use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }))
  .use(websocket())
  
  // Simple health check
  .get('/health', () => ({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }))
  
  // API info
  .get('/', () => ({
    name: 'Collaborative Code Editor API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      websocket: '/collaborate'
    }
  }))

  // Simple WebSocket for testing
  .ws('/collaborate', {
    open(ws) {
      console.log('✅ WebSocket connection opened');
      const query = ws.data.query || {};
      const documentId = query.documentId || 'test-doc';
      
      ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'Welcome to collaborative editor!',
        documentId 
      }));
    },
    
    message(ws, message) {
      console.log('📨 WebSocket message received:', message);
      
      // Echo back for testing
      ws.send(JSON.stringify({ 
        type: 'echo', 
        data: message,
        timestamp: new Date().toISOString()
      }));
    },
    
    close(ws) {
      console.log('❌ WebSocket connection closed');
    }
  })

  // Simple auth endpoints without validation
  .post('/api/auth/register', async ({ body }) => {
    try {
      console.log('Registration attempt:', body);
      
      // Mock response for testing
      return {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'Registration failed' };
    }
  })

  .post('/api/auth/login', async ({ body }) => {
    try {
      console.log('Login attempt:', body);
      
      // Mock response for testing
      return {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token'
      };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  })

  // Simple document endpoints
  .get('/api/documents', () => {
    return {
      documents: [
        {
          _id: 'doc-1',
          title: 'Sample Document',
          language: 'javascript',
          updatedAt: new Date().toISOString(),
          owner: { name: 'Test User', email: 'test@example.com' }
        }
      ]
    };
  })

  .post('/api/documents', async ({ body }) => {
    try {
      console.log('Creating document:', body);
      
      const mockDoc = {
        _id: 'doc-' + Math.random().toString(36).substr(2, 9),
        title: body?.title || 'Untitled Document',
        language: body?.language || 'javascript',
        content: '// Welcome to collaborative coding!\n\n',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: { name: 'Test User', email: 'test@example.com' }
      };
      
      return { document: mockDoc };
    } catch (error) {
      console.error('Document creation error:', error);
      return { error: 'Failed to create document' };
    }
  })

  // Simple invitation endpoints
  .post('/api/invitations/send', async ({ body }) => {
    try {
      console.log('Sending invitation:', body);
      
      const inviteToken = Math.random().toString(36).substr(2, 16);
      const inviteLink = `http://localhost:3000/invite/${inviteToken}`;
      
      return {
        invitation: {
          id: 'inv-' + Math.random().toString(36).substr(2, 9),
          documentId: body?.documentId,
          recipientEmail: body?.recipientEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        inviteLink
      };
    } catch (error) {
      console.error('Invitation error:', error);
      return { error: 'Failed to send invitation' };
    }
  })

  .get('/api/invitations/pending', () => {
    return { invitations: [] };
  })

  .post('/api/invitations/accept/:token', ({ params }) => {
    console.log('Accepting invitation:', params.token);
    
    return {
      message: 'Invitation accepted successfully',
      redirectUrl: `/editor/demo-doc-${Math.random().toString(36).substr(2, 6)}`
    };
  })

  .post('/api/invitations/decline/:token', ({ params }) => {
    console.log('Declining invitation:', params.token);
    return { message: 'Invitation declined successfully' };
  });

async function startServer() {
  try {
    console.log('🚀 Starting Collaborative Code Editor API...');
    
    // Try to connect to database (optional for testing)
    try {
      await connectToDatabase();
      console.log('✅ Connected to MongoDB');
    } catch (dbError) {
      console.log('⚠️  MongoDB connection failed, running without database');
      console.log('   This is OK for testing the basic functionality');
    }
    
    const port = 3001;
    
    app.listen(port, () => {
      console.log(`\n🎉 Server running successfully!`);
      console.log(`📍 API URL: http://localhost:${port}`);
      console.log(`🔗 WebSocket: ws://localhost:${port}/collaborate`);
      console.log(`💊 Health Check: http://localhost:${port}/health`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   GET  /health - Health check`);
      console.log(`   GET  / - API info`);
      console.log(`   WS   /collaborate - WebSocket collaboration`);
      console.log(`   POST /api/auth/register - User registration`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   GET  /api/documents - List documents`);
      console.log(`   POST /api/documents - Create document`);
      console.log(`   POST /api/invitations/send - Send invitation`);
      console.log(`\n🔧 Ready for frontend connection!`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();