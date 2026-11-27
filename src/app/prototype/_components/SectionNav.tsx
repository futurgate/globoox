import { Button } from '@/components/ui/button';

type SectionNavProps<T extends string> = {
  label: string;
  items: readonly { id: T; label: string }[];
  active: string;
  onSelect: (id: T) => void;
};

export function SectionNav<T extends string>({
  label,
  items,
  active,
  onSelect,
}: SectionNavProps<T>) {
  return (
    <nav aria-label={label} className="pt-sections">
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant="ghost"
          aria-current={item.id === active ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
