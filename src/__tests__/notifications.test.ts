import { beforeEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(), dismiss: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: sonner }));
import {
  ACTION_NOTIFICATION_DURATION_MS, MAX_VISIBLE_NOTIFICATIONS,
  dismissNotification, notificationIdentityChanged, notify,
  setNotificationFocused, setNotificationScope, setNotificationsSuppressed,
} from '@/lib/notifications';

beforeEach(() => {
  setNotificationScope(null);
  setNotificationsSuppressed(false);
  setNotificationsSuppressed(false, 'second-modal');
  setNotificationsSuppressed(false, 'delete');
  setNotificationsSuppressed(false, 'sort');
  notificationIdentityChanged(null, true);
  vi.clearAllMocks();
});

describe('App notification ownership and transitions', () => {
  it('merges operation transitions into one ID and does not reannounce repeated polls', () => {
    const scope = setNotificationScope('guest:a::share');
    const input = { scope, operationId: 'upload-1', event: 'unknown', title: 'Check upload' };
    const id = notify(input);
    expect(notify(input)).toBeNull();
    expect(notify({ ...input, event: 'ready', title: 'Ready' })).toBe(id);
    expect(notify(input)).toBeNull();
    expect(sonner.info).toHaveBeenCalledTimes(2);
    expect(setNotificationScope('guest:a::share')).toBe(scope);
  });

  it('rejects a late A result after A→B→A, including its retained action', () => {
    const scope = setNotificationScope('user:a::share');
    const onClick = vi.fn();
    notify({ scope, operationId: 'one', event: 'ready', title: 'Ready', action: { label: 'Open', onClick } });
    const oldAction = sonner.info.mock.calls[0][1].action.onClick;
    setNotificationScope('user:b::share');
    const newA = setNotificationScope('user:a::share');
    expect(newA).not.toBe(scope);
    expect(notify({ scope, operationId: 'two', event: 'ready', title: 'Stale' })).toBeNull();
    oldAction();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clears on account/logout but preserves initial matching session and token refresh', () => {
    notificationIdentityChanged('a');
    const scope = setNotificationScope('user:a::share');
    notify({ scope, operationId: 'one', event: 'ready', title: 'Ready' });
    notificationIdentityChanged('a');
    expect(sonner.dismiss).not.toHaveBeenCalled();
    notificationIdentityChanged('b');
    expect(sonner.dismiss).toHaveBeenCalledTimes(1);
    expect(notify({ scope, operationId: 'late', event: 'ready', title: 'Stale' })).toBeNull();
    const next = setNotificationScope('user:b::share');
    notificationIdentityChanged(null, true);
    expect(notify({ scope: next, operationId: 'late', event: 'ready', title: 'Stale' })).toBeNull();
  });

  it('drops modal events without queuing, and suppression owners release independently', () => {
    const scope = setNotificationScope('guest:a::share');
    const input = { scope, operationId: 'one', event: 'ready', title: 'Ready' };
    notify(input);
    setNotificationsSuppressed(true);
    setNotificationsSuppressed(true, 'second-modal');
    expect(notify({ ...input, event: 'updated' })).toBeNull();
    setNotificationsSuppressed(false);
    expect(notify({ ...input, event: 'updated' })).toBeNull();
    setNotificationsSuppressed(false, 'second-modal');
    expect(sonner.info).toHaveBeenCalledTimes(1);
    expect(notify({ ...input, event: 'updated' })).toBeNull();
    expect(notify({ ...input, event: 'manual-check-1' })).toBeTypeOf('string');
  });

  it('releases only the latest deferred transition after every unrelated dialog closes', () => {
    const scope = setNotificationScope('guest:a::share');
    const onClick = vi.fn();
    const input = { scope, operationId: 'upload', event: 'unknown', title: 'Checking' };
    setNotificationsSuppressed(true, 'delete', 'defer');
    setNotificationsSuppressed(true, 'sort', 'defer');
    expect(notify(input)).toBeNull();
    const ready = { ...input, event: 'ready', title: 'Ready', action: { label: 'Open', onClick } };
    expect(notify(ready)).toBeNull();
    expect(notify(ready)).toBeNull();
    setNotificationsSuppressed(false, 'delete');
    expect(sonner.info).not.toHaveBeenCalled();
    setNotificationsSuppressed(false, 'sort');
    expect(sonner.info).toHaveBeenCalledTimes(1);
    expect(sonner.info).toHaveBeenCalledWith('Ready', expect.objectContaining({ duration: ACTION_NOTIFICATION_DURATION_MS }));
    sonner.info.mock.calls[0][1].action.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(notify(ready)).toBeNull();
  });

  it('bounds deferred operations and keeps the most recently updated results', () => {
    const scope = setNotificationScope('guest:a::share');
    setNotificationsSuppressed(true, 'delete', 'defer');
    for (const operationId of ['old', 'updated', 'third']) notify({ scope, operationId, event: 'ready', title: operationId });
    notify({ scope, operationId: 'updated', event: 'changed', title: 'Latest update' });
    notify({ scope, operationId: 'new', event: 'ready', title: 'Newest' });
    setNotificationsSuppressed(false, 'delete');
    expect(sonner.info.mock.calls.map(([title]) => title)).toEqual(['third', 'Latest update', 'Newest']);
    expect(sonner.info).toHaveBeenCalledTimes(MAX_VISIBLE_NOTIFICATIONS);
    expect(notify({ scope, operationId: 'old', event: 'ready', title: 'Old poll' })).toBeNull();
  });

  it('an upload modal drops deferred and incoming events even while another dialog defers', () => {
    const scope = setNotificationScope('guest:a::share');
    const input = { scope, operationId: 'upload', event: 'ready', title: 'Ready' };
    setNotificationsSuppressed(true, 'delete', 'defer');
    notify(input);
    setNotificationsSuppressed(true);
    notify({ ...input, operationId: 'inside' });
    setNotificationsSuppressed(false);
    setNotificationsSuppressed(false, 'delete');
    expect(sonner.info).not.toHaveBeenCalled();
    expect(notify(input)).toBeNull();
    expect(notify({ ...input, operationId: 'inside' })).toBeNull();
  });

  it.each(['logout', 'navigation', 'account-switch'])('discards deferred results on %s', reason => {
    notificationIdentityChanged('a');
    const scope = setNotificationScope('user:a::share');
    setNotificationsSuppressed(true, 'delete', 'defer');
    notify({ scope, operationId: 'upload', event: 'ready', title: 'Ready' });
    if (reason === 'logout') notificationIdentityChanged(null, true);
    else if (reason === 'account-switch') notificationIdentityChanged('b');
    else setNotificationScope(null);
    setNotificationsSuppressed(false, 'delete');
    expect(sonner.info).not.toHaveBeenCalled();
    expect(notify({ scope, operationId: 'late', event: 'ready', title: 'Late' })).toBeNull();
  });

  it('cancellation removes a deferred result and rejects later results from that operation', () => {
    const scope = setNotificationScope('guest:a::share');
    setNotificationsSuppressed(true, 'delete', 'defer');
    const input = { scope, operationId: 'cancelled', event: 'ready', title: 'Ready' };
    notify(input);
    dismissNotification(scope, input.operationId);
    setNotificationsSuppressed(false, 'delete');
    expect(sonner.info).not.toHaveBeenCalled();
    expect(notify({ ...input, event: 'late' })).toBeNull();
  });

  it('bounds active messages and invalidates cancelled operations', () => {
    const scope = setNotificationScope('guest:a::share');
    const ids = Array.from({ length: MAX_VISIBLE_NOTIFICATIONS + 1 }, (_, index) =>
      notify({ scope, operationId: String(index), event: 'ready', title: 'Ready' }));
    expect(sonner.dismiss).toHaveBeenCalledWith(ids[0]);
    dismissNotification(scope, '3');
    expect(notify({ scope, operationId: '3', event: 'later', title: 'Late ready' })).toBeNull();
  });

  it('preserves title/kind and delegates focused duration to Sonner', () => {
    const scope = setNotificationScope('guest:a::share');
    const input = { scope, operationId: 'one', event: 'failed', title: 'Archive failed', kind: 'error' as const, action: { label: 'Retry', onClick: vi.fn() } };
    const id = notify(input)!;
    setNotificationFocused(id, true);
    expect(sonner.error).toHaveBeenLastCalledWith('Archive failed', expect.objectContaining({ id, duration: Infinity }));
    notify({ ...input, event: 'retry-failed', title: 'Try again' });
    expect(sonner.error).toHaveBeenLastCalledWith('Try again', expect.objectContaining({ duration: Infinity }));
    setNotificationFocused(id, false);
    expect(sonner.error).toHaveBeenLastCalledWith('Try again', expect.objectContaining({ duration: ACTION_NOTIFICATION_DURATION_MS }));
  });

  it('never evicts the keyboard-focused action when the visible limit is reached', () => {
    const scope = setNotificationScope('guest:a::share');
    const first = notify({ scope, operationId: 'focused', event: 'ready', title: 'Ready' })!;
    setNotificationFocused(first, true);
    const second = notify({ scope, operationId: 'second', event: 'ready', title: 'Ready' });
    notify({ scope, operationId: 'third', event: 'ready', title: 'Ready' });
    notify({ scope, operationId: 'fourth', event: 'ready', title: 'Ready' });
    expect(sonner.dismiss).toHaveBeenCalledWith(second);
    expect(sonner.dismiss).not.toHaveBeenCalledWith(first);
  });

  it('old action/auto-close callbacks cannot invalidate a newer transition', () => {
    const scope = setNotificationScope('guest:a::share');
    const oldClick = vi.fn();
    const newClick = vi.fn();
    const input = { scope, operationId: 'one', event: 'unknown', title: 'Check' };
    const id = notify({ ...input, action: { label: 'Check', onClick: oldClick } })!;
    const old = sonner.info.mock.calls[0][1];
    notify({ ...input, event: 'ready', title: 'Ready', action: { label: 'Open', onClick: newClick } });
    old.action.onClick();
    old.onAutoClose();
    expect(oldClick).not.toHaveBeenCalled();
    setNotificationFocused(id, true);
    expect(sonner.info).toHaveBeenLastCalledWith('Ready', expect.objectContaining({ duration: Infinity }));
    sonner.info.mock.calls[1][1].action.onClick();
    expect(newClick).toHaveBeenCalledTimes(1);
  });
});
