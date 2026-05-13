import { Hono } from 'hono';
import { cors } from 'hono/cors';
import movieRoutes from './routes/movies';
import tvRoutes from './routes/tv';
import streamRoutes from './routes/stream';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import collectionRoutes from './routes/collections';
import searchRoutes from './routes/search';
import { authMiddleware } from './middleware/auth';

const app = new Hono<{ Bindings: any }>();

// 1. Hardened CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// 2. Public Routes
app.route('/api/movies', movieRoutes);
app.route('/api/tv', tvRoutes);
app.route('/api/collections', collectionRoutes);
app.route('/api/search', searchRoutes);

// 3. Protected Routes
app.use('/api/stream/*', authMiddleware);
app.use('/api/user/*', authMiddleware);
app.use('/api/admin/*', authMiddleware);

// Collections management requires auth for mutations
app.on(['POST', 'PUT', 'DELETE'], '/api/collections/*', authMiddleware);
app.on(['POST', 'PUT', 'DELETE'], '/api/collections', authMiddleware);

app.route('/api/stream', streamRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/user', userRoutes);

// User history/watched etc would go here...

app.get('/healthz', (c) => c.text('OK'));

export default app;
