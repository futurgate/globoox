import type { CSSProperties, ReactNode } from 'react';
import { getThemeStyle } from '@/lib/themes';
import { UIPortalScope } from '@/components/ui/ui-portal-scope';
import '../prototype.css';

export default function TranslationSurface({ children }: { children: ReactNode }) {
  return (
    <UIPortalScope
      lang="ru"
      className="pt-root"
      style={getThemeStyle('forest-light') as CSSProperties}
    >
      {children}
    </UIPortalScope>
  );
}
