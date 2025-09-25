export const metadata = {
  title: 'TimTracker Web',
  description: 'Hello World Next.js 15 app'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


