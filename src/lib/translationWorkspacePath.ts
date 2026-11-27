export const workspaceBase = '/studio';

export function templateLink(name: string, variant?: string) {
  const base = workspaceBase + '/settings/templates/' + encodeURIComponent(name);
  return variant ? base + '?variant=' + encodeURIComponent(variant) : base;
}
