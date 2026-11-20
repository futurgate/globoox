// An administrator's variants live in this browser. The server catalog only stores
// the one effective text for each registered pipeline filename.
export interface PromptVariant {
  ownerId: string;
  id: string;
  template: string;
  label: string;
  content: string;
  revision: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('globoox-translation-prompt-variants', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('variants', { keyPath: ['ownerId', 'id'] });
      store.createIndex('owner', 'ownerId');
      store.createIndex('uniqueName', ['ownerId', 'template', 'label'], { unique: true });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function listPromptVariants(ownerId: string): Promise<PromptVariant[]> {
  const db = await openDatabase();
  try {
    return await new Promise<PromptVariant[]>((resolve, reject) => {
      const tx = db.transaction('variants', 'readonly');
      const request = tx.objectStore('variants').index('owner').getAll(ownerId);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function savePromptVariant(
  ownerId: string, template: string, label: string, content: string, previous?: PromptVariant,
): Promise<PromptVariant> {
  const variant: PromptVariant = {
    ownerId, template, label: label.trim(), content, id: previous?.id ?? crypto.randomUUID(),
    revision: (previous?.revision ?? 0) + 1,
  };
  await writeVariant(variant, previous?.revision, false);
  return variant;
}

export async function deletePromptVariant(variant: PromptVariant): Promise<void> {
  await writeVariant(variant, variant.revision, true);
}

async function writeVariant(variant: PromptVariant, expectedRevision: number | undefined, remove: boolean) {
  const db = await openDatabase();
  try {
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('variants', 'readwrite');
      const store = tx.objectStore('variants');
      if (expectedRevision === undefined) {
        store.add(variant);
      } else {
        const key = [variant.ownerId, variant.id];
        const read = store.get(key);
        read.onsuccess = () => {
          const saved = read.result as PromptVariant | undefined;
          if (saved?.revision !== expectedRevision || saved.template !== variant.template) {
            reject(new Error('В другой вкладке вариант был изменён. Скопируйте свои правки и откройте его заново.'));
            tx.abort();
          } else if (remove) {
            store.delete(key);
          } else {
            store.put(variant);
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error?.name === 'ConstraintError'
        ? new Error('У этого шаблона уже есть вариант с таким названием.') : tx.error);
    });
  } finally { db.close(); }
}
