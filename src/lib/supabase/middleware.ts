import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicBookshelf = pathname === '/my-books' || pathname === '/my-books/';
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
          if (publicBookshelf && cookiesToSet.length > 0) {
            // The public shell must not make a refreshed session cacheable.
            supabaseResponse.headers.set('Cache-Control', 'private, no-store');
          }
        },
      },
    }
  );

  if (publicBookshelf) {
    // This route renders only the public bookshelf shell. getSession renews
    // expiring tokens through setAll above without an extra getUser round trip
    // for a fresh cookie. Never use its unverified user for access or rendering:
    // the catalog API authorizes every server request independently.
    await supabase.auth.getSession();
  } else {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}
