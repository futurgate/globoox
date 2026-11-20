import { NextResponse, type NextRequest } from 'next/server';
import { isPrototypePath } from '@/lib/prototypePath';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const liveWorkspace = pathname === '/prototype/to-be' || pathname.startsWith('/prototype/to-be/');
  if (isPrototypePath(pathname) && !liveWorkspace) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ routes (excluded so Next.js doesn't buffer the request body for
     *   file uploads; API auth uses Authorization header, not session cookies)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
