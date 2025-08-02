# 🚀 Real-Time Collaborative Code Editor

A modern, real-time collaborative code editor built with Next.js, Elysia.js, Y.js, Monaco Editor, and MongoDB.

## ✨ Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously with conflict-free merging using Y.js CRDT
- **Monaco Editor**: Full-featured code editor with syntax highlighting, IntelliSense, and themes
- **WebSocket Communication**: Real-time synchronization using Elysia.js native WebSocket support
- **User Presence**: See other users' cursors and activity in real-time
- **Document Management**: Create, share, and manage code documents
- **Authentication**: JWT-based user authentication (optional)
- **Offline Support**: Continue editing offline and sync when reconnected
- **Multiple Languages**: Support for JavaScript, TypeScript, Python, Java, C++, HTML, CSS, JSON, Markdown

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│                 │ ◄─────────────► │                 │
│   Frontend      │                 │   Backend       │
│   (Next.js)     │                 │   (Elysia.js)   │
│                 │                 │                 │
│ • Monaco Editor │                 │ • Y.js Server   │
│ • Y.js Client   │                 │ • WebSocket     │
│ • React         │                 │ • MongoDB       │
│ • Tailwind CSS  │                 │ • Authentication│
└─────────────────┘                 └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │                 │
                                    │    MongoDB      │
                                    │                 │
                                    │ • Documents     │
                                    │ • Users         │
                                    │ • Sessions      │
                                    │ • Y.js States   │
                                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- MongoDB (local or cloud)
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd collaborative-code-editor
```

### 2. Setup Backend

```bash
cd backend
bun install
cp .env.example .env
```

Edit `.env` with your MongoDB connection string:
```bash
MONGODB_URI=mongodb://localhost:27017/collaborative-editor
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-here
```

Start the backend:
```bash
bun run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Start the frontend:
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/collaborate

## 📁 Project Structure

```
collaborative-code-editor/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   │   ├── editor/      # Editor-related components
│   │   │   └── ui/          # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   └── stores/          # State management
│   └── package.json
├── backend/                  # Elysia.js backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # MongoDB models
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   └── package.json
└── README.md
```

## 🔧 Key Technologies

### Frontend
- **Next.js 14+**: React framework with App Router
- **Monaco Editor**: VS Code editor for the web
- **Y.js**: CRDT for conflict-free collaborative editing
- **y-monaco**: Monaco Editor bindings for Y.js
- **y-websocket**: WebSocket provider for Y.js
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management

### Backend
- **Elysia.js**: Fast and type-safe web framework for Bun
- **Bun**: JavaScript runtime and package manager
- **MongoDB**: Document database with Mongoose ODM
- **Y.js**: CRDT implementation for document synchronization
- **WebSocket**: Real-time communication
- **JWT**: JSON Web Token authentication
- **bcryptjs**: Password hashing

## 🔄 Real-Time Collaboration Flow

1. **Document Loading**: Client connects to WebSocket and loads Y.js document state
2. **Real-time Editing**: Text changes are captured by Monaco Editor and sent to Y.js
3. **Conflict Resolution**: Y.js CRDT automatically merges concurrent edits
4. **Broadcasting**: Changes are broadcast to all connected clients via WebSocket
5. **Persistence**: Document state is periodically saved to MongoDB

## 🎯 Usage

### Creating a Document
1. Navigate to the dashboard
2. Click "New Document"
3. Enter title and select programming language
4. Start coding!

### Collaborating
1. Share the document URL with others
2. Multiple users can edit simultaneously
3. See real-time cursors and changes
4. All changes are automatically saved

### Editor Features
- Syntax highlighting for multiple languages
- Auto-completion and IntelliSense
- Multi-cursor editing
- Find and replace
- Code folding
- Minimap
- Dark/light themes

## 🔒 Security Features

- JWT-based authentication
- Document access control (owner/collaborator permissions)
- Input validation and sanitization
- Rate limiting on WebSocket connections
- CORS configuration
- Password hashing with bcrypt

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
bun run build
bun run start
```

### Frontend Deployment
```bash
cd frontend
npm run build
npm run start
```

### Environment Variables
Make sure to set appropriate environment variables for production:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Strong secret for JWT signing
- `FRONTEND_URL`: Frontend URL for CORS
- `NODE_ENV=production`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include steps to reproduce for bugs

## 🔮 Future Enhancements

- [ ] Voice/video chat integration
- [ ] Code execution environment
- [ ] Version history and branching
- [ ] Plugin system for extensions
- [ ] Mobile app support
- [ ] Integration with Git repositories
- [ ] Advanced permission system
- [ ] Comment and annotation system