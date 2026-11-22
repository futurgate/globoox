import { getStoredReaderAccessToken, hasReaderSessionCookie } from './api';

const temporaryStatuses = new Set([408, 429, 500, 502, 503, 504]);
const networkError = /failed to fetch|fetch failed|load failed|networkerror|network (?:request failed|error)|network connection was lost/i;

export function studioErrorMessage(value: unknown, fallback: string, status?: number) {
  const detail = value instanceof Error ? value.message : typeof value === 'string' ? value : '';
  if (/[а-яё]/i.test(detail)) return detail;
  if (status === 401) return 'Не удалось подтвердить сеанс. Войдите в кабинет снова.';
  if (status === 403) return 'Недостаточно прав для этого действия.';
  if (status === 429) return 'Слишком много запросов. Попробуйте чуть позже.';
  if (status && status >= 500) return 'Сервер временно недоступен. Попробуйте чуть позже.';
  if (networkError.test(detail)) return 'Не удалось связаться с сервером. Проверьте соединение.';
  return fallback;
}

// Same-origin APIs verify Supabase cookies directly, without acquiring the browser auth lock.
export function studioRequestToken() {
  return hasReaderSessionCookie() ? null : getStoredReaderAccessToken();
}

function retryDelay(response: Response) {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return 500;
  const seconds = Number(retryAfter);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
  // Leave longer cooldowns to the user; do not send an earlier request.
  if (!Number.isFinite(ms)) return 500;
  return ms > 3000 ? null : Math.max(0, ms);
}

function waitForRetry(ms: number, signal?: AbortSignal | null) {
  signal?.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** Read requests get one recovery attempt. A write or a translation launch is sent exactly once. */
export async function studioFetch(path: string, options: RequestInit = {}, sessionToken?: string | null) {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Недопустимый адрес API кабинета.');
  const headers = new Headers(options.headers);
  const token = sessionToken === undefined ? studioRequestToken() : sessionToken;
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const method = (options.method ?? 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; ; attempt++) {
    options.signal?.throwIfAborted();
    let delay = 500;
    try {
      const response = await fetch(path, { ...options, credentials: 'same-origin', headers });
      if (!isRead || attempt > 0 || !temporaryStatuses.has(response.status)) return response;
      const cooldown = retryDelay(response);
      if (cooldown === null) return response;
      delay = cooldown;
      await response.body?.cancel();
    } catch (error) {
      options.signal?.throwIfAborted();
      if (!(error instanceof TypeError)) throw error;
      if (!isRead || attempt > 0) throw new Error(studioErrorMessage(error, 'Не удалось связаться с сервером.'), { cause: error });
    }
    await waitForRetry(delay, options.signal);
  }
}
