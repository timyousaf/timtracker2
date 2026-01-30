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
  try {
    const headersList = await headers();

    // Check for GPT API key auth
    const authHeader = headersList.get('authorization') || '';
    
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const gptApiKey = process.env.GPT_API_KEY;
      
      if (gptApiKey && token === gptApiKey) {
        return { type: 'gpt', userId: 'chatgpt-system' };
      }
      
      // Log auth failure details for debugging (without exposing tokens)
      if (gptApiKey) {
        console.log('[Auth] Bearer token provided but did not match GPT_API_KEY', {
          tokenLength: token.length,
          expectedLength: gptApiKey.length,
          tokenPrefix: token.substring(0, 4),
          expectedPrefix: gptApiKey.substring(0, 4),
        });
      } else {
        console.log('[Auth] Bearer token provided but GPT_API_KEY is not set');
      }
    }

    // Otherwise use Clerk
    const { userId } = await auth();
    if (userId) {
      return { type: 'clerk', userId };
    }

    // Log when no auth found
    console.log('[Auth] No valid auth found', {
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader ? authHeader.split(' ')[0] : 'none',
    });

    return null;
  } catch (error) {
    console.error('[Auth] Error during authentication:', error);
    return null;
  }
}

/**
 * Get the user ID for database operations.
 * Returns 'chatgpt-system' for GPT requests.
 */
export async function getUserId(): Promise<string | null> {
  const authResult = await getAuth();
  return authResult?.userId ?? null;
}
