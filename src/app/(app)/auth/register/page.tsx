'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { safeLocalReturnPath } from '@/lib/authNavigation';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeLocalReturnPath(searchParams.get('next'));
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If Supabase email confirmation is disabled, session is returned immediately
    if (!data.session) {
      // Fallback: try signing in (handles edge cases)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    // user_signed_up is tracked centrally in PostHogProvider
    setMessage('Account created. Redirecting to your library...');
    setRedirecting(true);
    setLoading(false);
    setTimeout(() => router.push(nextUrl), 1800);
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
    }
    // user_signed_up is tracked centrally in PostHogProvider after OAuth callback
  };

  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] text-[var(--app-text)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md border-[color:var(--app-border)] bg-[color:var(--app-elevated-bg)] text-[var(--app-text)] shadow-md backdrop-blur-sm">
          <CardHeader className="space-y-1.5 p-6">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Enter your email to create a new account</CardDescription>
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
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || redirecting}
                    minLength={8}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-[var(--app-text-muted)]"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading || redirecting}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading || redirecting}
                    minLength={8}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-[var(--app-text-muted)]"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={loading || redirecting}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="h-10 w-full" disabled={loading || redirecting}>
                {loading || redirecting ? <Loader2 className="size-4 animate-spin" /> : 'Create account'}
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
              disabled={loading || redirecting}
            >
              <GoogleIcon className="size-4" />
              Continue with Google
            </Button>

            <p className="text-center text-sm text-[var(--app-text-muted)]">
              Already have an account?{' '}
              <Link href={`/auth?next=${encodeURIComponent(nextUrl)}`} className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
