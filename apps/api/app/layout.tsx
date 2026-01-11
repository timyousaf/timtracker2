import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'TimTracker API',
  description: 'TimTracker API server'
};

/**
 * Minimal layout for API-only Next.js app.
 * Required by Next.js even though we only serve API routes.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
