'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setShareToken } from '@/lib/api';
import { invalidateBooksCache } from '@/lib/useBooks';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Curated share-link entry point: /s/<token>.
 * Persists the token and redirects into the library, which will then show ONLY
 * the books curated for this link (no registration required).
 */
export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      setShareToken(token);
      // Drop any previously cached guest/library data so the curated list paints fresh.
      invalidateBooksCache();
    }
    router.replace('/my-books');
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-shell-bg)] text-[var(--app-text)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--app-text-muted)]" />
    </div>
  );
}
