import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'TimTracker Web',
  description: 'Hello World Next.js app with Clerk'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}


