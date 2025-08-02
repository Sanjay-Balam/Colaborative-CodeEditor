import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import { connectToDatabase } from './utils/database';
import { websocketRoutes } from './routes/websocket';
import { authRoutes } from './routes/auth';
import { documentRoutes } from './routes/documents';
import { invitationRoutes } from './routes/invitations';

const app = new Elysia()
  .use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }))
  .use(websocket())
  .use(websocketRoutes)
  .use(authRoutes)
  .use(documentRoutes)
  .use(invitationRoutes)
  
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