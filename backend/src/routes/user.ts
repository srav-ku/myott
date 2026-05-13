import { Hono } from 'hono';

const app = new Hono<{ 
  Bindings: any;
  Variables: {
    user: any;
  };
}>();

app.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not Found' }, 404);
  
  return c.json({
    isAdmin: !!user.isAdmin,
    adminMode: 'restricted',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      stealthMode: false
    }
  });
});

export default app;
