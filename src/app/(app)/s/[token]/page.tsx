'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { withShareContext } from '@/lib/shareNavigation';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Curated share-link entry point: /s/<token>.
 * Carries the token in the library URL, which will then show ONLY
 * the books curated for this link (no registration required).
 */
export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(withShareContext('/my-books', token));
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-shell-bg)] text-[var(--app-text)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--app-text-muted)]" />
    </div>
  );
}
