import { Elysia } from 'elysia';
import { verifyToken } from '../utils/auth';
import { User } from '../models/User';

export const authMiddleware = new Elysia()
  .derive(async ({ headers }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return { user: null };
    }

    try {
      const user = await User.findById(payload.userId).select('-passwordHash');
      return { user };
    } catch (error) {
      console.error('Error finding user:', error);
      return { user: null };
    }
  });

export const requireAuth = new Elysia()
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Authentication required' };
    }
  });