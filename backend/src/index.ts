import { Hono } from 'hono';
import { cors } from 'hono/cors';
import movieRoutes from './routes/movies';
import tvRoutes from './routes/tv';
import streamRoutes from './routes/stream';
import adminRoutes from './routes/admin';
import searchRoutes from './routes/search';
import userRoutes from './routes/user';
import { authMiddleware } from './middleware/auth';

const app = new Hono<{ Bindings: any }>();

// 1. Hardened CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// 3. Protected Routes
app.use('/api/stream/*', authMiddleware);
app.use('/api/admin/*', authMiddleware);
app.use('/api/user/*', authMiddleware);

// 2. Public Routes (and those using optional auth)
app.route('/api/movies', movieRoutes);
app.route('/api/tv', tvRoutes);
app.route('/api/search', searchRoutes);

app.route('/api/stream', streamRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/user', userRoutes);

app.get('/healthz', (c) => c.text('OK'));

export default app;

