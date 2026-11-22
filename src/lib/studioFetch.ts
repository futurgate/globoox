import { getStoredReaderAccessToken, hasReaderSessionCookie } from './api';

// Same-origin APIs verify Supabase cookies directly, without acquiring the browser auth lock.
export function studioRequestToken() {
  return hasReaderSessionCookie() ? null : getStoredReaderAccessToken();
}

/** Studio uses the same signed-in session as the reader for all same-origin APIs. */
export async function studioFetch(path: string, options: RequestInit = {}, sessionToken?: string | null) {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Недопустимый адрес API кабинета.');
  const headers = new Headers(options.headers);
  const token = sessionToken === undefined ? studioRequestToken() : sessionToken;
  options.signal?.throwIfAborted();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(path, { ...options, credentials: 'same-origin', headers });
}
