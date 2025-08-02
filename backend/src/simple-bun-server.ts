import { connectToDatabase } from './utils/database';

console.log('🚀 Starting Collaborative Code Editor API...');

// Simple HTTP server using Bun
const server = Bun.serve({
  port: 3001,
  
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // API info
    if (path === '/') {
      return new Response(JSON.stringify({
        name: 'Collaborative Code Editor API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          websocket: '/collaborate'
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // WebSocket upgrade for collaboration
    if (path === '/collaborate') {
      const success = server.upgrade(req, {
        data: {
          documentId: url.searchParams.get('documentId') || 'default',
          userId: url.searchParams.get('userId') || 'anonymous'
        }
      });
      
      if (success) {
        return undefined; // Upgraded to WebSocket
      }
      
      return new Response('WebSocket upgrade failed', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Mock API endpoints for testing
    if (path.startsWith('/api/')) {
      return await handleAPIRequest(req, path, corsHeaders);
    }

    // Not found
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  },

  websocket: {
    open(ws) {
      console.log('✅ WebSocket connection opened');
      const { documentId, userId } = ws.data;
      
      ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'Welcome to collaborative editor!',
        documentId,
        userId,
        timestamp: new Date().toISOString()
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
  }
});

async function handleAPIRequest(req: Request, path: string, corsHeaders: Record<string, string>) {
  try {
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    // Auth endpoints
    if (path === '/api/auth/register' && req.method === 'POST') {
      console.log('Registration attempt:', body);
      return new Response(JSON.stringify({
        user: {
          id: 'user-123',
          email: body.email || 'test@example.com',
          name: body.name || 'Test User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      console.log('Login attempt:', body);
      return new Response(JSON.stringify({
        user: {
          id: 'user-123',
          email: body.email || 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Document endpoints
    if (path === '/api/documents' && req.method === 'GET') {
      return new Response(JSON.stringify({
        documents: [
          {
            _id: 'doc-1',
            title: 'Sample Document',
            language: 'javascript',
            updatedAt: new Date().toISOString(),
            owner: { name: 'Test User', email: 'test@example.com' }
          }
        ]
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path === '/api/documents' && req.method === 'POST') {
      console.log('Creating document:', body);
      const mockDoc = {
        _id: 'doc-' + Math.random().toString(36).substr(2, 9),
        title: body.title || 'Untitled Document',
        language: body.language || 'javascript',
        content: '// Welcome to collaborative coding!\n\n',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: { name: 'Test User', email: 'test@example.com' }
      };
      
      return new Response(JSON.stringify({ document: mockDoc }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Invitation endpoints
    if (path === '/api/invitations/send' && req.method === 'POST') {
      console.log('Sending invitation:', body);
      const inviteToken = Math.random().toString(36).substr(2, 16);
      const inviteLink = `http://localhost:3000/invite/${inviteToken}`;
      
      return new Response(JSON.stringify({
        invitation: {
          id: 'inv-' + Math.random().toString(36).substr(2, 9),
          documentId: body.documentId,
          recipientEmail: body.recipientEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        inviteLink
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path === '/api/invitations/pending' && req.method === 'GET') {
      return new Response(JSON.stringify({ invitations: [] }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path.startsWith('/api/invitations/accept/') && req.method === 'POST') {
      const token = path.split('/').pop();
      console.log('Accepting invitation:', token);
      
      return new Response(JSON.stringify({
        message: 'Invitation accepted successfully',
        redirectUrl: `/editor/demo-doc-${Math.random().toString(36).substr(2, 6)}`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path.startsWith('/api/invitations/decline/') && req.method === 'POST') {
      const token = path.split('/').pop();
      console.log('Declining invitation:', token);
      
      return new Response(JSON.stringify({
        message: 'Invitation declined successfully'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // API endpoint not found
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('API request error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function startServer() {
  try {
    // Try to connect to database (optional for testing)
    try {
      await connectToDatabase();
      console.log('✅ Connected to MongoDB');
    } catch (dbError) {
      console.log('⚠️  MongoDB connection failed, running without database');
      console.log('   This is OK for testing the basic functionality');
    }
    
    console.log(`\n🎉 Server running successfully!`);
    console.log(`📍 API URL: http://localhost:3001`);
    console.log(`🔗 WebSocket: ws://localhost:3001/collaborate`);
    console.log(`💊 Health Check: http://localhost:3001/health`);
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
    console.log(`\n🌐 Try opening: http://localhost:3001/health`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();