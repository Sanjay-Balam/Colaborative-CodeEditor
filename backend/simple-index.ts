import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { websocket } from '@elysiajs/websocket'

const app = new Elysia()
  .use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8003',
    credentials: true
  }))
  .use(websocket())
  .get('/', () => ({
    message: 'Collaborative Code Editor API is running!',
    version: '1.0.0',
    status: 'ok'
  }))
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }))
  .ws('/collaborate', {
    message(ws, message) {
      console.log('WebSocket message:', message)
    },
    open(ws) {
      console.log('WebSocket connection opened')
      ws.send(JSON.stringify({ type: 'connection-established' }))
    },
    close(ws) {
      console.log('WebSocket connection closed')
    }
  })
  .listen(process.env.PORT || 8002)

console.log(`🚀 Server running on http://localhost:${process.env.PORT || 8002}`)
console.log(`🔗 WebSocket endpoint: ws://localhost:${process.env.PORT || 8002}/collaborate`)
console.log(`📋 Health check: http://localhost:${process.env.PORT || 8002}/health`)