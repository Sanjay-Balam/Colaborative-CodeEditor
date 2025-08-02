export interface CollaborationMessage {
  type: 'yjs-update' | 'cursor-update' | 'user-join' | 'user-leave' | 'awareness-update';
  documentId: string;
  userId: string;
  data: any;
  timestamp: number;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  cursor: CursorPosition;
  color: string;
}

export interface DocumentPermission {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}