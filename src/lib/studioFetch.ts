import { getBrowserAccessToken } from './api';

/** Studio uses the same signed-in session as the reader for all same-origin APIs. */
export async function studioFetch(path: string, options: RequestInit = {}, sessionToken?: string) {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Недопустимый адрес API кабинета.');
  const headers = new Headers(options.headers);
  const token = sessionToken || await getBrowserAccessToken();
  options.signal?.throwIfAborted();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return fetch(path, { ...options, credentials: 'same-origin', headers });
}
