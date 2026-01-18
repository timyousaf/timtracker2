import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

export type AuthResult =
  | { type: 'clerk'; userId: string }
  | { type: 'gpt'; userId: 'chatgpt-system' }
  | null;

/**
 * Get authentication info from either Clerk or GPT API key.
 * Use this in API routes to identify the caller.
 */
export async function getAuth(): Promise<AuthResult> {
  const headersList = await headers();

  // Check for GPT API key auth
  const authHeader = headersList.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (process.env.GPT_API_KEY && token === process.env.GPT_API_KEY) {
      return { type: 'gpt', userId: 'chatgpt-system' };
    }
  }

  // Otherwise use Clerk
  const { userId } = await auth();
  if (userId) {
    return { type: 'clerk', userId };
  }

  return null;
}

/**
 * Get the user ID for database operations.
 * Returns 'chatgpt-system' for GPT requests.
 */
export async function getUserId(): Promise<string | null> {
  const authResult = await getAuth();
  return authResult?.userId ?? null;
}
