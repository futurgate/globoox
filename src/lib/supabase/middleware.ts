import { workspaceBase } from '@/lib/translationWorkspacePath';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicShell = pathname === '/my-books' || pathname === '/my-books/' ||
    pathname === workspaceBase || pathname.startsWith(workspaceBase + '/');
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (publicShell && cookiesToSet.length > 0) {
            // The public shell must not make a refreshed session cacheable.
            supabaseResponse.headers.set('Cache-Control', 'private, no-store');
          }
        },
      },
    }
  );

  if (publicShell) {
    // These pages render public shells. APIs authenticate each data request.
    // Renew expiring cookies without a user-lookup round trip on navigation.
    await supabase.auth.getSession();
  } else {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}
