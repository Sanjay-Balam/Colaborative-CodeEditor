import { Elysia } from 'elysia'
import mongoose from 'mongoose'

console.log('Starting Collaborative Code Editor Backend...')

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-editor'

async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI)
      console.log('✅ Connected to MongoDB')
    }
    return mongoose.connection
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

const app = new Elysia()
  .get('/', () => ({
    message: 'Collaborative Code Editor API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health'
    },
    timestamp: new Date().toISOString()
  }))
  
  .get('/health', () => ({
    status: 'ok',
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  }))

  .listen(8002)

// Start the server
async function startServer() {
  try {
    await connectToDatabase()
    console.log('✅ Server started successfully!')
    console.log('🚀 Server running at http://localhost:8002')
    console.log('📋 Health check: http://localhost:8002/health')
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app