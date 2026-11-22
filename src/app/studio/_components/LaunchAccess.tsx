'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBookData } from './bookRequests';

export function useLaunchAccess(author: boolean) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const result = useBookData<{ canStartTranslation: boolean }>(author ? '/api/studio/translation-access' : null, version);
  useEffect(() => {
    if (!author) return;
    window.addEventListener('focus',refresh);
    return () => window.removeEventListener('focus',refresh);
  }, [author,refresh]);
  return { allowed: !author || result?.data?.canStartTranslation === true, loading: author && !result,
    error: result?.error, refresh };
}

export function LaunchAccessNotice({ access }: { access: ReturnType<typeof useLaunchAccess> }) {
  if (access.loading) return <p className="pt-muted text-sm" role="status">Проверяем доступ к запуску…</p>;
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    {access.error ? <p role="alert">{access.error}</p> : <p className="pt-muted">Доступ к запуску перевода выдаёт администратор.</p>}
    <Button variant="ghost" size="sm" onClick={access.refresh}>Обновить доступ</Button>
  </div>;
}
