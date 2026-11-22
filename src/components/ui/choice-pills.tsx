import type { ReactNode } from 'react';
import { Button } from './button';
import { uiFilterPillActive, uiFilterPillBase, uiFilterPillInactive } from './button-styles';
import { cn } from '@/lib/utils';

interface ChoicePillsProps<T extends string> {
  label: string;
  value: T;
  choices: readonly { id: T; label: ReactNode }[];
  onChange: (value: T) => void;
}

export function ChoicePills<T extends string>({ label, value, choices, onChange }: ChoicePillsProps<T>) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1">
    {choices.map(choice => <Button key={choice.id} type="button" variant="outline" size="sm"
      aria-pressed={choice.id === value} onClick={() => onChange(choice.id)}
      className={cn(uiFilterPillBase, choice.id === value ? uiFilterPillActive : uiFilterPillInactive)}>
      {choice.label}
    </Button>)}
  </div>;
}
