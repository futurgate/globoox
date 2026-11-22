'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshButton } from './RequestFeedback';
import { useBookData } from './bookRequests';

export function useLaunchAccess(verifyAccess = true) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  const result = useBookData<{ canStartTranslation: boolean }>(verifyAccess ? '/api/studio/translation-access' : null, version);
  useEffect(() => {
    if (!verifyAccess) return;
    window.addEventListener('focus',refresh);
    return () => window.removeEventListener('focus',refresh);
  }, [verifyAccess,refresh]);
  return { allowed: !verifyAccess || result?.data?.canStartTranslation === true, loading: verifyAccess && !result,
    error: result?.error, refreshing: result?.refreshing === true, refresh };
}

export function LaunchAccessNotice({ access, editorial = false }: { access: ReturnType<typeof useLaunchAccess>; editorial?: boolean }) {
  if (access.loading) return <p className="pt-muted text-sm" role="status">{editorial ? 'Проверяем доступ к редактированию…' : 'Проверяем доступ к запуску…'}</p>;
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    {access.error ? <p role="alert">{access.error}</p> : <p className="pt-muted">{editorial ? 'Редактирование своих книг доступно приглашённым авторам. Доступ выдаёт администратор.' : 'Доступ к запуску перевода выдаёт администратор.'}</p>}
    <RefreshButton size="sm" pending={access.refreshing} onClick={access.refresh}>Обновить доступ</RefreshButton>
  </div>;
}
