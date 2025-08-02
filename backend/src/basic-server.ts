console.log('🚀 Starting Collaborative Code Editor API...');

// Simple HTTP server using Bun
const server = Bun.serve({
  port: 3002,
  
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
        timestamp: new Date().toISOString(),
        message: 'Collaborative Code Editor API is running!'
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
        message: 'Welcome to the real-time collaborative code editor!',
        endpoints: {
          health: '/health',
          websocket: '/collaborate',
          auth: '/api/auth/*',
          documents: '/api/documents',
          invitations: '/api/invitations/*'
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
          documentId: url.searchParams.get('documentId') || 'default-doc',
          userId: url.searchParams.get('userId') || 'anonymous-user-' + Math.random().toString(36).substr(2, 6)
        }
      });
      
      if (success) {
        return undefined; // Successfully upgraded to WebSocket
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
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      availableEndpoints: ['/', '/health', '/collaborate', '/api/*']
    }), { 
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },

  websocket: {
    open(ws) {
      console.log('✅ WebSocket connection opened');
      const { documentId, userId } = ws.data;
      
      console.log(`👤 User ${userId} joined document ${documentId}`);
      
      ws.send(JSON.stringify({ 
        type: 'connection-established', 
        message: 'Welcome to the collaborative editor!',
        documentId,
        userId,
        timestamp: new Date().toISOString(),
        status: 'connected'
      }));

      // Send welcome message with collaboration info
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'collaboration-info',
          message: 'Real-time collaboration is active. Start typing to see the magic!',
          features: [
            'Real-time synchronization',
            'Conflict-free editing',
            'Live user presence',
            'Automatic saving'
          ]
        }));
      }, 1000);
    },

    message(ws, message) {
      console.log('📨 WebSocket message received from', ws.data.userId, ':', message);
      
      try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        
        // Simulate collaboration by echoing back with modifications
        ws.send(JSON.stringify({ 
          type: 'collaboration-update',
          originalMessage: data,
          echo: `Echo from server: ${JSON.stringify(data)}`,
          timestamp: new Date().toISOString(),
          userId: ws.data.userId,
          documentId: ws.data.documentId
        }));
      } catch (error) {
        // Handle non-JSON messages
        ws.send(JSON.stringify({ 
          type: 'echo', 
          data: message,
          timestamp: new Date().toISOString(),
          userId: ws.data.userId
        }));
      }
    },

    close(ws) {
      console.log('❌ WebSocket connection closed for user', ws.data.userId);
    }
  }
});

async function handleAPIRequest(req: Request, path: string, corsHeaders: Record<string, string>) {
  try {
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    // Auth endpoints
    if (path === '/api/auth/register' && req.method === 'POST') {
      console.log('📝 Registration attempt:', body);
      return new Response(JSON.stringify({
        success: true,
        user: {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          email: body.email || 'test@example.com',
          name: body.name || 'Test User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9),
        message: 'Registration successful!'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      console.log('🔐 Login attempt:', body);
      return new Response(JSON.stringify({
        success: true,
        user: {
          id: 'user-123',
          email: body.email || 'test@example.com',
          name: 'Demo User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9),
        message: 'Login successful!'
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
        success: true,
        documents: [
          {
            _id: 'doc-sample-1',
            title: 'My First Collaborative Document',
            language: 'javascript',
            content: '// Welcome to collaborative coding!\nconsole.log("Hello, World!");',
            updatedAt: new Date().toISOString(),
            owner: { name: 'Demo User', email: 'demo@example.com' }
          },
          {
            _id: 'doc-sample-2',
            title: 'Python Data Analysis',
            language: 'python',
            content: '# Data analysis script\nimport pandas as pd\nprint("Hello Python!")',
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            owner: { name: 'Python User', email: 'python@example.com' }
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
      console.log('📄 Creating document:', body);
      const mockDoc = {
        _id: 'doc-' + Math.random().toString(36).substr(2, 9),
        title: body.title || 'Untitled Document',
        language: body.language || 'javascript',
        content: `// Welcome to ${body.title || 'your new document'}!\n// Start coding here...\n\n`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: { name: 'Demo User', email: 'demo@example.com' }
      };
      
      return new Response(JSON.stringify({ 
        success: true,
        document: mockDoc,
        message: 'Document created successfully!'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Invitation endpoints
    if (path === '/api/invitations/send' && req.method === 'POST') {
      console.log('📧 Sending invitation:', body);
      const inviteToken = Math.random().toString(36).substr(2, 16);
      const inviteLink = `http://localhost:3000/invite/${inviteToken}`;
      
      return new Response(JSON.stringify({
        success: true,
        invitation: {
          id: 'inv-' + Math.random().toString(36).substr(2, 9),
          documentId: body.documentId,
          recipientEmail: body.recipientEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        inviteLink,
        message: `Invitation sent to ${body.recipientEmail}!`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path === '/api/invitations/pending' && req.method === 'GET') {
      return new Response(JSON.stringify({ 
        success: true,
        invitations: [
          {
            id: 'inv-demo-1',
            document: {
              title: 'Sample Collaborative Project',
              language: 'javascript'
            },
            sender: {
              name: 'Alice Developer',
              email: 'alice@example.com'
            },
            createdAt: new Date().toISOString(),
            inviteToken: 'demo-token-123'
          }
        ]
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path.startsWith('/api/invitations/accept/') && req.method === 'POST') {
      const token = path.split('/').pop();
      console.log('✅ Accepting invitation:', token);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Invitation accepted successfully!',
        redirectUrl: `/editor/demo-doc-${Math.random().toString(36).substr(2, 6)}`,
        document: {
          id: 'demo-doc-accepted',
          title: 'Collaborative Document',
          language: 'javascript'
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (path.startsWith('/api/invitations/decline/') && req.method === 'POST') {
      const token = path.split('/').pop();
      console.log('❌ Declining invitation:', token);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Invitation declined successfully'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // API endpoint not found
    return new Response(JSON.stringify({ 
      success: false,
      error: 'API endpoint not found',
      path: path,
      method: req.method,
      availableEndpoints: {
        auth: ['POST /api/auth/register', 'POST /api/auth/login'],
        documents: ['GET /api/documents', 'POST /api/documents'],
        invitations: ['POST /api/invitations/send', 'GET /api/invitations/pending', 'POST /api/invitations/accept/:token', 'POST /api/invitations/decline/:token']
      }
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('❌ API request error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

console.log(`\n🎉 Server started successfully!`);
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
console.log(`🌐 Try opening: http://localhost:3001/health`);
console.log(`🎯 Start frontend with: cd ../frontend && npm run dev`);