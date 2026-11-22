'use client';

import { useState } from 'react';
import { PendingText, RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { studioFetch } from '@/lib/studioFetch';
import { checkedResponse, useBookAction, useBookData } from './bookRequests';

const endpoint = '/api/studio/author-grants';
type Grant = { userId: string; email: string; grantedAt: string };
type GrantPage = { grants: Grant[]; nextCursor: string | null };

export function AuthorGrants({ ownerId }: { ownerId: string }) {
  const [email, setEmail] = useState('');
  const [pages, setPages] = useState<string[]>(['']);
  const [refresh, setRefresh] = useState(0);
  const action = useBookAction();
  const cursor = pages[pages.length - 1];
  const result = useBookData<GrantPage>(endpoint + (cursor ? '?' + new URLSearchParams({after:cursor}) : ''), action.version + refresh);
  const page = result?.data;

  function grantAccess() {
    const address = email.trim();
    if (!address) return;
    void action.run(async signal => {
      const response = await checkedResponse(await studioFetch(endpoint, {
        method: 'PUT', signal, headers: { 'Content-Type':'application/json', 'X-Workspace-Account': ownerId },
        body: JSON.stringify({ email:address }),
      }));
      const saved: Grant = await response.json();
      if (!saved.userId || !saved.email) throw Error('Сервер не подтвердил доступ.');
      signal.throwIfAborted();
      setEmail(''); setPages(['']);
      return 'Доступ открыт для ' + saved.email + '.';
    });
  }

  function revoke(grant: Grant) {
    void action.run(async signal => {
      const response = await checkedResponse(await studioFetch(endpoint + '?' + new URLSearchParams({userId:grant.userId}), {
        method: 'DELETE', signal, headers: { 'X-Workspace-Account': ownerId },
      }));
      const saved = await response.json();
      if (saved.revoked !== true) throw Error('Сервер не подтвердил отзыв доступа.');
      signal.throwIfAborted();
      if (page?.grants.length === 1 && cursor) setPages(current => current.slice(0,-1));
      return 'Доступ отозван у ' + grant.email + '.';
    });
  }

  return <Card className="gap-4 p-4 sm:p-5">
    <h2>Доступ авторов к переводу</h2>
    <p className="pt-muted">Приглашённый автор может запускать перевод своих книг и серий. Такие запуски расходуют средства на модели.</p>
    <form className="flex flex-wrap items-end gap-2" onSubmit={event => {event.preventDefault(); grantAccess();}}>
      <label className="pt-field flex-1">Email зарегистрированного автора
        <Input type="email" required autoComplete="off" maxLength={254} value={email} disabled={action.busy}
          onChange={event => setEmail(event.target.value)} placeholder="author@example.com"/>
      </label>
      <Button type="submit" disabled={action.busy || !email.trim()}>Выдать доступ</Button>
    </form>
    {action.busy && <PendingText>Сохраняем права доступа…</PendingText>}
    {action.error && <p role="alert">{action.error}</p>}
    {action.notice && <p role="status" className="pt-muted">{action.notice}</p>}
    <div className="flex flex-wrap items-center justify-between border-t pt-3">
      <h3>Авторы с доступом</h3>
      <RefreshButton pending={!result || result.refreshing} size="sm" variant="ghost" disabled={action.busy} onClick={() => setRefresh(n => n + 1)}>Обновить список</RefreshButton>
    </div>
    {!result && <p role="status">Загружаем список…</p>}
    {result?.error && <p role="alert">{result.error}</p>}
    {page && (page.grants.length ? <ul className="divide-y">{page.grants.map(grant =>
      <li key={grant.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="min-w-0"><p className="break-all">{grant.email}</p>
          <small className="pt-muted">Доступ с {new Date(grant.grantedAt).toLocaleDateString('ru-RU')}</small></div>
        <Button size="sm" variant="outline" disabled={action.busy} onClick={() => revoke(grant)}
          aria-label={'Отозвать доступ у ' + grant.email}>Отозвать доступ</Button>
      </li>)}</ul> : <p className="pt-muted">{cursor ? 'На этой странице больше нет авторов.' : 'Доступ пока никому не выдан.'}</p>)}
    {(pages.length > 1 || page?.nextCursor) && <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={!cursor || action.busy} onClick={() => setPages(p => p.slice(0,-1))}>Назад</Button>
      <Button type="button" size="sm" variant="outline" disabled={!page?.nextCursor || action.busy} onClick={() => {
        const next = page?.nextCursor;
        if (next) setPages(p => [...p,next]);
      }}>Далее</Button>
    </div>}
  </Card>;
}
