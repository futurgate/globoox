const ORIGINAL_LANDING_PATH = /^\/(?:landing|(?:en|es|fr|ru)(?:\/landing)?)\/?$/;

/** Editorial previews and their locale/legal pages share the landing consent gate. */
export function isLandingConsentPath(pathname: string): boolean {
  return pathname === '/landing-editorial'
    || pathname.startsWith('/landing-editorial/')
    || ORIGINAL_LANDING_PATH.test(pathname);
}
