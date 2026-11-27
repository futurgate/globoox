/** Standalone mock workspaces have no account or analytics session. */
export function isPrototypePath(pathname: string): boolean {
  return pathname === '/prototype' || pathname.startsWith('/prototype/');
}
