import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>TimTracker</h1>
      <p>Monorepo workspace @timtracker/web.</p>
      <p>
        API endpoint: <a href="/api/hello">/api/hello</a>
      </p>

      <SignedOut>
        <p>
          <Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">Sign up</Link>
        </p>
      </SignedOut>

      <SignedIn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserButton afterSignOutUrl="/" />
          <span>You are signed in.</span>
        </div>
      </SignedIn>
    </main>
  );
}


