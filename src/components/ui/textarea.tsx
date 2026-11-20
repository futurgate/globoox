import type { ComponentProps } from 'react';
import { fieldStyles } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldStyles, 'min-h-20 resize-y py-2', className)}
      {...props}
    />
  );
}
