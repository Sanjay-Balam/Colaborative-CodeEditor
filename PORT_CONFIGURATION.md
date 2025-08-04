# Port Configuration Guide

## Updated Port Configuration

### Backend (Port 8002)
- **Server URL**: `http://localhost:8002`
- **WebSocket URL**: `ws://localhost:8002/collaborate`
- **API Endpoints**: `http://localhost:8002/api/*`

### Frontend (Port 8003)
- **App URL**: `http://localhost:8003`
- **Development Server**: Next.js with Turbopack

## Environment Files

### Backend `.env`
```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://sanjay0701:kWlSJbHUh9v0uvnv@cluster0.mfvmnuu.mongodb.net/collaborative-editor

# Server Configuration
PORT=8002
FRONTEND_URL=http://localhost:8003

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8003
```

### Frontend `.env.local`
```env
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_WS_URL=ws://localhost:8002/collaborate
NEXT_PUBLIC_FRONTEND_URL=http://localhost:8003

# Development Settings
NODE_ENV=development
```

## How to Start the Application

### 1. Start Backend (Terminal 1)
```bash
cd /mnt/c/Users/ivect/Desktop/Practice/colaborative-code-editor/backend
bun run index.ts
```
Expected output:
```
✅ Connected to MongoDB
🚀 Server running at http://localhost:8002
🔗 WebSocket endpoint: ws://localhost:8002/collaborate
```

### 2. Start Frontend (Terminal 2)
```bash
cd /mnt/c/Users/ivect/Desktop/Practice/colaborative-code-editor/frontend
npm run dev
```
Expected output:
```
▲ Next.js 15.4.5
- Local:        http://localhost:8003
- Network:      http://0.0.0.0:8003
```

## Updated Configuration Summary

### What Was Changed:
1. **Backend Port**: Changed from 3001 → 8002
2. **Frontend Port**: Already set to 8003 in package.json
3. **CORS Origins**: Updated to allow requests from port 8003
4. **API URLs**: All frontend HTTP requests now go to port 8002
5. **WebSocket URLs**: All WebSocket connections now connect to port 8002
6. **Invite Links**: Generate links pointing to frontend port 8003

### Files Modified:
- `backend/index.ts` - Updated port and CORS settings
- `backend/.env` - Created with correct configuration
- `frontend/.env.local` - Updated API and WebSocket URLs
- `frontend/src/hooks/useChatMessages.ts` - Updated API endpoints
- `frontend/src/hooks/useCodeComments.ts` - Updated API endpoints
- `frontend/src/hooks/useNotifications.ts` - Updated API endpoints
- `frontend/src/components/editor/MonacoEditor.tsx` - Updated WebSocket URL

## Testing the Connection

1. Start both servers as described above
2. Open browser to `http://localhost:8003`
3. Navigate to any document editor
4. Check browser console for successful WebSocket connection
5. Test real-time features like chat, comments, and notifications

## Troubleshooting

If you encounter connection issues:

1. **Check ports are available**: Make sure nothing else is running on 8002 or 8003
2. **Verify environment files**: Ensure .env files are in the correct locations
3. **Check browser console**: Look for CORS or connection errors
4. **Verify MongoDB connection**: Ensure your MongoDB Atlas connection string is correct
5. **Test backend directly**: Visit `http://localhost:8002/health` to verify backend is running

The application should now work seamlessly with backend on port 8002 and frontend on port 8003! 🚀