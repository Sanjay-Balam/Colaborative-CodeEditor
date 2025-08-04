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

// Basic schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
})

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const chatMessageSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 1000 },
  messageType: { type: String, enum: ['text', 'code', 'system'], default: 'text' },
  createdAt: { type: Date, default: Date.now }
})

const invitationSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmail: { type: String, required: true },
  inviteToken: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  permissions: { type: String, enum: ['read', 'write'], default: 'write' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
})

const User = mongoose.model('User', userSchema)
const Document = mongoose.model('Document', documentSchema)
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
const Invitation = mongoose.model('Invitation', invitationSchema)

const app = new Elysia()
  // Add CORS headers for all requests
  .onRequest(({ request, set }) => {
    set.headers['Access-Control-Allow-Origin'] = process.env.FRONTEND_URL || 'http://localhost:8003'
    set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    set.headers['Access-Control-Allow-Credentials'] = 'true'
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      set.status = 200
      return new Response(null)
    }
  })
  
  // Basic routes
  .get('/', () => ({
    message: 'Collaborative Code Editor API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      documents: '/api/documents',
      chat: '/api/chat',
      invitations: '/api/invitations'
    },
    timestamp: new Date().toISOString()
  }))
  
  .get('/health', () => ({
    status: 'ok',
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  }))

  // Document routes
  .get('/api/documents', async () => {
    try {
      const documents = await Document.find()
        .populate('owner', 'name email')
        .sort({ updatedAt: -1 })
        .limit(10)
      
      return { documents, count: documents.length }
    } catch (error) {
      console.error('❌ Error fetching documents:', error)
      return { error: 'Failed to fetch documents', documents: [] }
    }
  })

  .post('/api/documents', async ({ body }) => {
    try {
      const { title, language = 'javascript' } = body as any
      
      // For demo purposes, create with a dummy owner
      const document = new Document({
        title,
        language,
        content: '// Welcome to the collaborative editor!\n// Start coding together!\n\n',
        owner: new mongoose.Types.ObjectId(), // Demo owner
        collaborators: [],
        isPublic: true
      })
      
      await document.save()
      
      return { 
        success: true,
        document: {
          id: document._id,
          title: document.title,
          language: document.language,
          content: document.content,
          createdAt: document.createdAt
        }
      }
    } catch (error) {
      console.error('❌ Error creating document:', error)
      return { error: 'Failed to create document' }
    }
  })

  // Chat routes
  .get('/api/chat/messages/:documentId', async ({ params }) => {
    try {
      const messages = await ChatMessage.find({ documentId: params.documentId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
      
      return { messages: messages.reverse() }
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error)
      return { error: 'Failed to fetch messages', messages: [] }
    }
  })

  .post('/api/chat/messages', async ({ body }) => {
    try {
      const { documentId, message, userId } = body as any
      
      const chatMessage = new ChatMessage({
        documentId,
        userId: userId || new mongoose.Types.ObjectId(), // Demo user
        message,
        messageType: 'text'
      })
      
      await chatMessage.save()
      await chatMessage.populate('userId', 'name email')
      
      return { success: true, message: chatMessage }
    } catch (error) {
      console.error('❌ Error saving chat message:', error)
      return { error: 'Failed to save message' }
    }
  })

  // Invitation routes
  .post('/api/invitations/send', async ({ body }) => {
    try {
      const { documentId, recipientEmail } = body as any
      
      console.log('📧 Creating invitation:', { documentId, recipientEmail })
      
      // Validate input
      if (!recipientEmail) {
        return { error: 'Recipient email is required' }
      }
      
      // Generate unique invite token
      const inviteToken = Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
      
      // Create or find document
      let docId
      if (!documentId || typeof documentId === 'string' && documentId.startsWith('demo-')) {
        // Create a demo document for this invitation
        const demoDoc = new Document({
          title: 'Collaborative Document',
          content: '// Welcome to collaborative coding!\n// Your friend has invited you to code together.\n\nconsole.log("Hello, collaborative world!");',
          language: 'javascript',
          owner: new mongoose.Types.ObjectId(),
          isPublic: true
        })
        await demoDoc.save()
        docId = demoDoc._id
        console.log('📄 Created demo document:', docId)
      } else {
        // Try to convert string to ObjectId or create new one
        try {
          docId = new mongoose.Types.ObjectId(documentId)
        } catch (e) {
          // If invalid ObjectId, create a new demo document
          const demoDoc = new Document({
            title: 'Collaborative Document',
            content: '// Welcome to collaborative coding!\n// Your friend has invited you to code together.\n\nconsole.log("Hello, collaborative world!");',
            language: 'javascript',
            owner: new mongoose.Types.ObjectId(),
            isPublic: true
          })
          await demoDoc.save()
          docId = demoDoc._id
          console.log('📄 Created demo document for invalid ID:', docId)
        }
      }
      
      const invitation = new Invitation({
        documentId: docId,
        senderId: new mongoose.Types.ObjectId(), // Demo sender
        recipientEmail,
        inviteToken,
        status: 'pending',
        permissions: 'write'
      })
      
      console.log('💾 Saving invitation...')
      await invitation.save()
      console.log('✅ Invitation saved successfully')
      
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:8003'}/invite/${inviteToken}`
      
      return { 
        success: true,
        invitation: {
          id: invitation._id,
          inviteToken,
          inviteLink,
          recipientEmail,
          documentId: docId
        },
        message: 'Invitation sent successfully!'
      }
    } catch (error) {
      console.error('❌ Error sending invitation:', error)
      console.error('❌ Full error details:', error.message, error.stack)
      return { error: `Failed to send invitation: ${error.message}` }
    }
  })

  .get('/api/invitations/pending', async () => {
    try {
      const invitations = await Invitation.find({ status: 'pending' })
        .populate([
          { path: 'documentId', select: 'title language' },
          { path: 'senderId', select: 'name email' }
        ])
        .sort({ createdAt: -1 })
        .limit(10)
      
      return { 
        invitations: invitations.map(inv => ({
          id: inv._id,
          document: inv.documentId,
          sender: inv.senderId,
          createdAt: inv.createdAt,
          inviteToken: inv.inviteToken
        }))
      }
    } catch (error) {
      console.error('❌ Error fetching pending invitations:', error)
      return { error: 'Failed to fetch invitations', invitations: [] }
    }
  })

  .get('/api/invitations/details/:token', async ({ params }) => {
    try {
      const invitation = await Invitation.findOne({ 
        inviteToken: params.token,
        status: 'pending'
      })
        .populate([
          { path: 'documentId', select: 'title language content' },
          { path: 'senderId', select: 'name email' }
        ])
      
      if (!invitation) {
        return { error: 'Invitation not found or expired' }
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        return { error: 'Invitation has expired' }
      }
      
      return { 
        invitation: {
          id: invitation._id,
          document: invitation.documentId,
          sender: invitation.senderId,
          permissions: invitation.permissions,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt
        }
      }
    } catch (error) {
      console.error('❌ Error fetching invitation details:', error)
      return { error: 'Failed to fetch invitation details' }
    }
  })

  .post('/api/invitations/accept/:token', async ({ params }) => {
    try {
      const invitation = await Invitation.findOne({ 
        inviteToken: params.token,
        status: 'pending'
      }).populate('documentId', 'title')
      
      if (!invitation) {
        return { error: 'Invitation not found or already processed' }
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        return { error: 'Invitation has expired' }
      }
      
      // Update invitation status
      invitation.status = 'accepted'
      await invitation.save()
      
      return { 
        success: true,
        message: 'Invitation accepted successfully',
        redirectUrl: `/editor/${invitation.documentId}`
      }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error)
      return { error: 'Failed to accept invitation' }
    }
  })

  .post('/api/invitations/decline/:token', async ({ params }) => {
    try {
      const invitation = await Invitation.findOne({ 
        inviteToken: params.token,
        status: 'pending'
      })
      
      if (!invitation) {
        return { error: 'Invitation not found or already processed' }
      }
      
      // Update invitation status
      invitation.status = 'declined'
      await invitation.save()
      
      return { 
        success: true,
        message: 'Invitation declined'
      }
    } catch (error) {
      console.error('❌ Error declining invitation:', error)
      return { error: 'Failed to decline invitation' }
    }
  })

  .listen(8002)

// Start the server
async function startServer() {
  try {
    await connectToDatabase()
    console.log('✅ Server started successfully!')
    console.log('🚀 Server running at http://localhost:8002')
    console.log('📋 Health check: http://localhost:8002/health')
    console.log('🔗 WebSocket: ws://localhost:8002/collaborate')
    console.log('📝 API Docs: http://localhost:8002/')
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app