import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import { connectToDatabase } from './utils/database';

const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }))
  .use(websocket())
  
  // Simple WebSocket route for testing
  .ws('/collaborate', {
    open(ws) {
      console.log('WebSocket connection opened');
      ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to the collaborative editor!' }));
    },
    
    message(ws, message) {
      console.log('WebSocket message received:', message);
      // Echo back for testing
      ws.send(JSON.stringify({ type: 'echo', data: message }));
    },
    
    close(ws) {
      console.log('WebSocket connection closed');
    }
  })
  
  // Health check
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  
  // Basic API info
  .get('/', () => ({
    name: 'Collaborative Code Editor API',
    version: '1.0.0',
    status: 'running'
  }));

async function startServer() {
  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    const port = 3001;
    
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