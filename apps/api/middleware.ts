import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/api/hello',
]);

export default clerkMiddleware(async (auth, req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    });
  }

  if (isPublicRoute(req)) return;

  // Check for GPT API key auth (Bearer token)
  const authHeader = req.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (process.env.GPT_API_KEY && token === process.env.GPT_API_KEY) {
      // Valid GPT key - allow request to proceed
      return NextResponse.next();
    }
  }

  // Fall back to Clerk auth
  const { userId } = await auth();
  if (!userId) {
    // For API routes, return 401 instead of redirect
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

export const config = {
  matcher: [
    '/(api)(.*)',
  ]
};
