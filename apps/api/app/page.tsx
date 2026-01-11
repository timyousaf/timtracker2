/**
 * Minimal page for API-only app.
 * All user-facing UI is served by the Expo app.
 */
export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>TimTracker API</h1>
      <p>This is the API server. Visit the main app for the UI.</p>
      <p>
        <a href="/api/hello">/api/hello</a> - Health check endpoint
      </p>
    </main>
  );
}
