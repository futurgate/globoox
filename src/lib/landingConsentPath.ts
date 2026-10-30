const ORIGINAL_LANDING_PATH = /^\/(?:landing|(?:en|es|fr|ru)(?:\/landing)?)\/?$/;
const BUSINESS_LANDING_PATH = /^\/(?:authors(?:\/hero-archive)?|publishers)\/?$/;

/** Editorial previews and their locale/legal pages share the landing consent gate. */
export function isLandingConsentPath(pathname: string): boolean {
  return pathname === '/landing-editorial'
    || pathname.startsWith('/landing-editorial/')
    || BUSINESS_LANDING_PATH.test(pathname)
    || ORIGINAL_LANDING_PATH.test(pathname);
}
