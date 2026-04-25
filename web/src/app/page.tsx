export default function Home() {
  return (
    <main style={{ padding: '32px', maxWidth: 720 }}>
      <h1 style={{ marginBottom: 8 }}>OTT Backend</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        API is running. The frontend will live here later — for now everything
        is exposed under <code>/api/*</code>.
      </p>
      <ul style={{ lineHeight: 1.9 }}>
        <li>
          <a href="/api/healthz" style={{ color: '#7ad' }}>
            /api/healthz
          </a>{' '}
          — health check
        </li>
        <li>
          <code>/api/movies</code>, <code>/api/tv</code>,{' '}
          <code>/api/episodes</code>, <code>/api/links/[id]</code>
        </li>
        <li>
          <code>/api/search</code>, <code>/api/watchlist</code>,{' '}
          <code>/api/reports</code>
        </li>
        <li>
          <code>/api/admin/*</code>
        </li>
      </ul>
    </main>
  );
}
