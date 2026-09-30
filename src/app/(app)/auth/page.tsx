'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { trackUserLoggedIn } from '@/lib/posthog';
import { safeLocalReturnPath } from '@/lib/authNavigation';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'Authentication failed. Please try again.' : null
  );
  const [message, setMessage] = useState<string | null>(null);
  const nextUrl = safeLocalReturnPath(searchParams.get('next'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabase();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      trackUserLoggedIn('email');
      // Force a full navigation so server-side API proxy sees the fresh auth session immediately.
      window.location.assign(nextUrl);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      trackUserLoggedIn('google');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] text-[var(--app-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-6">
        <section className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-md border-[color:var(--app-border)] bg-[color:var(--app-elevated-bg)] text-[var(--app-text)] shadow-md backdrop-blur-sm">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Enter your email to continue to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8 text-[var(--app-text-muted)]"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
                </Button>
              </form>

              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                className="h-10 w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon className="size-4" />
                Continue with Google
              </Button>

              <p className="text-center text-sm text-[var(--app-text-muted)]">
                Don&apos;t have an account?{' '}
                <Link href={`/auth/register?next=${encodeURIComponent(nextUrl)}`} className="text-primary underline-offset-4 hover:underline">
                  Create account
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
        <p className="pb-2 text-center text-sm text-[var(--app-text-muted)]">
          <Link href={nextUrl} className="text-primary underline-offset-4 hover:underline">
            Browse as guest
          </Link>
        </p>
      </div>
    </div>
  );
}
