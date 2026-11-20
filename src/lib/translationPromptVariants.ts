export interface PersonalPrompt {
  id: string;
  template: string;
  label: string;
  content: string;
  active: boolean;
  deletedAt: string | null;
  revision: number;
}

export type LegacyPrompt = Pick<PersonalPrompt, 'id' | 'template' | 'label' | 'content'> & { ownerId: string };

const endpoint = '/api/admin/personal-prompts';

function isPrompt(value: unknown): value is PersonalPrompt {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PersonalPrompt>;
  return typeof item.id === 'string' && typeof item.template === 'string' && typeof item.label === 'string'
    && typeof item.content === 'string' && typeof item.active === 'boolean' && typeof item.revision === 'number'
    && (item.deletedAt === null || typeof item.deletedAt === 'string');
}

export class PersonalPromptError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function send(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message ?? data?.statusMessage ?? data?.error?.message;
    throw new PersonalPromptError(typeof message === 'string' ? message : 'Сервер не выполнил запрос (' + response.status + ').', response.status);
  }
  return data;
}

export async function listPersonalPrompts(signal?: AbortSignal): Promise<PersonalPrompt[]> {
  const data = await send(endpoint, { signal });
  if (!Array.isArray(data?.variants) || !data.variants.every(isPrompt)) throw new Error('Сервер не вернул библиотеку личных вариантов.');
  return data.variants;
}

type CreatePrompt = Pick<PersonalPrompt, 'id' | 'template' | 'label' | 'content'> & { activate: boolean };
type UpdatePrompt = Partial<Pick<PersonalPrompt, 'active' | 'content' | 'label'>> & { deleted?: boolean; revision: number };

async function write(ownerId: string, path: string, method: string, body: CreatePrompt | UpdatePrompt): Promise<PersonalPrompt> {
  const data = await send(path, { method, headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': ownerId }, body: JSON.stringify(body) });
  if (!isPrompt(data?.variant)) throw new Error('Сервер не подтвердил сохранение варианта.');
  return data.variant;
}

export const createPersonalPrompt = (ownerId: string, body: CreatePrompt) => write(ownerId, endpoint, 'POST', body);
export const updatePersonalPrompt = (ownerId: string, id: string, changes: UpdatePrompt) =>
  write(ownerId, endpoint + '/' + encodeURIComponent(id), 'PATCH', changes);

// Older studio releases kept drafts in this device. Only the current account
// can import its own drafts. Reading an absent legacy database leaves no store.
export async function readLegacyPrompts(ownerId: string): Promise<LegacyPrompt[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    let missing = false;
    const request = indexedDB.open('globoox-translation-prompt-variants');
    request.onupgradeneeded = () => {
      missing = true;
      request.transaction?.abort();
    };
    request.onerror = () => missing ? resolve(null) : reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  if (!db) return [];
  try {
    return await new Promise<LegacyPrompt[]>((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const request = tx.objectStore('variants').index('owner').getAll(ownerId);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
