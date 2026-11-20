'use client';

import { createContext, useContext, useState, type ComponentPropsWithoutRef } from 'react';

const PortalHost = createContext<HTMLElement | null | undefined>(undefined);

/** Mount overlays inside the nearest themed scope, outside the triggering control's layout. */
export function UIPortalScope({ children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <div {...props} ref={setHost}>
      <PortalHost.Provider value={host}>{children}</PortalHost.Provider>
    </div>
  );
}

export function useUIPortalHost() {
  const host = useContext(PortalHost);
  if (host !== undefined) return host;
  return typeof document === 'undefined' ? null : document.body;
}
