import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLocalReturnPath } from '@/lib/authNavigation';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeLocalReturnPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to auth page with error
  const retryUrl = new URL('/auth', origin);
  retryUrl.searchParams.set('error', 'auth_failed');
  retryUrl.searchParams.set('next', next);
  return NextResponse.redirect(retryUrl);
}
