import { Elysia, t } from 'elysia';
import { User } from '../models/User';
import { generateToken, hashPassword, comparePassword } from '../utils/auth';
import { authMiddleware } from '../middleware/auth';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body, set }) => {
    try {
      const { email, name, password } = body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        set.status = 400;
        return { error: 'User already exists with this email' };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = new User({
        email,
        name,
        passwordHash
      });

      await user.save();

      // Generate token
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name
      });

      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String(),
      name: t.String(),
      password: t.String()
    })
  })

  .post('/login', async ({ body, set }) => {
    try {
      const { email, password } = body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        set.status = 401;
        return { error: 'Invalid email or password' };
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        set.status = 401;
        return { error: 'Invalid email or password' };
      }

      // Generate token
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name
      });

      return {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    })
  })

  .use(authMiddleware)
  .get('/me', ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Authentication required' };
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    };
  });