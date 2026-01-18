export const metadata = {
  title: 'TimTracker API',
  description: 'TimTracker API server'
};

/**
 * Minimal layout for API-only Next.js app.
 * Required by Next.js even though we only serve API routes.
 * Note: No ClerkProvider needed - API routes use server-side auth() directly.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
