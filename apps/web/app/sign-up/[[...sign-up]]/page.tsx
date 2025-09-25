import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 24 }}>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}


