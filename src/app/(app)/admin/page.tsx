'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldAlert, FlaskConical, Gauge, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';

type AdminLink = {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
};

const ADMIN_LINKS: AdminLink[] = [
  {
    href: '/admin/playground',
    title: 'Translation Playground',
    description:
      'Compare how different LLM models translate the same passage, and score each output with the MQM quality judge.',
    Icon: FlaskConical,
  },
  {
    href: '/admin/cost-lab',
    title: 'Translation Cost Lab',
    description:
      'Measure the real first-time cost of translating a whole book on a chosen model, and browse the history of measured runs.',
    Icon: Gauge,
  },
];

export default function AdminHomePage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-text-muted)]" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[var(--app-text-muted)]" />
        <p className="text-lg font-medium">Admins only</p>
        <p className="text-sm text-[var(--app-text-muted)]">
          You don&apos;t have access to the admin area.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Back to settings
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24">
      <PageHeader title="Admin" />

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Internal tools for the Globoox team. Everything here is admin-gated.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {ADMIN_LINKS.map(({ href, title, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4 transition-colors hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-bg)]"
          >
            <div className="mb-2 flex items-center justify-between">
              <Icon className="h-5 w-5 text-[var(--app-accent)]" />
              <ChevronRight className="h-4 w-4 text-[var(--app-text-muted)] transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="text-base font-semibold">{title}</span>
            <span className="mt-1 text-sm text-[var(--app-text-muted)]">{description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
