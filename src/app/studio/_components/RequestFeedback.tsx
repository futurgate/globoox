import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Spinner() {
  return <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none"/>;
}

export function PendingText({ children }: { children: string }) {
  return <p className="pt-muted flex items-center gap-2 text-sm" role="status"><Spinner/>{children}</p>;
}

export function RefreshButton({ pending, disabled, children = 'Обновить', variant = 'ghost', ...props }:
  ComponentProps<typeof Button> & { pending: boolean }) {
  return <Button {...props} variant={variant} aria-busy={pending} disabled={disabled || pending}>
    {pending ? <><Spinner/>Обновляем…</> : children}
  </Button>;
}
