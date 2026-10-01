'use client';

import { toast } from 'sonner';

export const APP_TOASTER_ID = 'app-notifications';
export const MAX_VISIBLE_NOTIFICATIONS = 3;
export const NOTIFICATION_DURATION_MS = 6_000;
export const ACTION_NOTIFICATION_DURATION_MS = 10_000;

/** Capture at operation start, not when its asynchronous result arrives. */
export type NotificationScope = Readonly<{ key: string; generation: number }>;
export type AppNotification = {
  scope: NotificationScope | null;
  operationId: string;
  /** A state transition, e.g. "ready". Repeated polls/renders do not reannounce it. */
  event: string;
  title: string;
  description?: string;
  kind?: 'info' | 'success' | 'warning' | 'error';
  action?: { label: string; onClick: () => void };
};

let generation = 0;
let currentScope: NotificationScope | null = null;
let identity: string | null | undefined;
export type NotificationSuppression = 'drop' | 'defer';

const suppressedBy = new Map<string, NotificationSuppression>();
const deferred = new Map<string, AppNotification>();
const seenEvents = new Map<string, Set<string>>();
const invalidatedOperations = new Set<string>();
const active = new Map<string, {
  scope: NotificationScope;
  operationId: string;
  title: string;
  kind: NonNullable<AppNotification['kind']>;
  duration: number;
  focused: boolean;
}>();

function dismissActive() {
  for (const id of active.keys()) toast.dismiss(id);
  active.clear();
}

/** Same scope is stable across ordinary page remounts. Account/share changes retire old handles. */
export function setNotificationScope(key: string | null): NotificationScope | null {
  if (currentScope?.key === key) return currentScope;
  dismissActive();
  deferred.clear();
  seenEvents.clear();
  invalidatedOperations.clear();
  currentScope = key ? Object.freeze({ key, generation: ++generation }) : null;
  return currentScope;
}

/** Host auth guard; INITIAL_SESSION and token refresh preserve a matching scope. */
export function notificationIdentityChanged(userId: string | null, signedOut = false) {
  const prefix = currentScope?.key.split('::', 1)[0];
  const wrongActor = prefix?.startsWith('user:')
    ? prefix !== `user:${userId}`
    : prefix?.startsWith('guest:') && userId !== null;
  if (signedOut || wrongActor || (identity !== undefined && identity !== userId)) {
    setNotificationScope(null);
  }
  identity = userId;
}

function isCurrent(scope: NotificationScope | null): scope is NotificationScope {
  return scope !== null && scope === currentScope;
}

function toastId(scope: NotificationScope, operationId: string) {
  return `app-notification:${scope.generation}:${operationId}`;
}

/** Upload results live inside their modal; unrelated dialogs defer a bounded set of new results. */
export function setNotificationsSuppressed(suppressed: boolean, owner = 'modal', mode: NotificationSuppression = 'drop') {
  if (suppressed) {
    suppressedBy.set(owner, mode);
    if (mode === 'drop') deferred.clear();
    dismissActive();
  } else {
    suppressedBy.delete(owner);
    if (!suppressedBy.size) {
      const waiting = [...deferred.values()];
      deferred.clear();
      for (const input of waiting) presentNotification(input);
    }
  }
}

/** All current product notifications use Sonner's single polite live region. */
export function notify(input: AppNotification): string | null {
  const { scope, operationId, event } = input;
  if (!isCurrent(scope) || !operationId || !event || invalidatedOperations.has(operationId)) return null;
  const events = seenEvents.get(operationId) ?? new Set<string>();
  if (events.has(event)) return null;
  events.add(event);
  seenEvents.set(operationId, events);

  if (suppressedBy.size) {
    if (![...suppressedBy.values()].includes('drop')) {
      // Only the latest transition matters when a dialog closes. Renew its position
      // so the bounded queue retains the most recent operations, not stale results.
      deferred.delete(operationId);
      deferred.set(operationId, input);
      if (deferred.size > MAX_VISIBLE_NOTIFICATIONS) deferred.delete(deferred.keys().next().value!);
    }
    return null;
  }
  return presentNotification(input);
}

function presentNotification(input: AppNotification): string | null {
  const { scope, operationId, title, description, action, kind = 'info' } = input;
  if (!isCurrent(scope) || invalidatedOperations.has(operationId)) return null;
  const id = toastId(scope, operationId);
  // Sonner owns presentation and all timing. Retire the oldest visible operation instead of
  // leaving an unbounded backlog of hidden, actionable notifications in its stack.
  if (!active.has(id) && active.size >= MAX_VISIBLE_NOTIFICATIONS) {
    const oldest = [...active].find(([, entry]) => !entry.focused)?.[0];
    if (!oldest) return null;
    toast.dismiss(oldest);
    active.delete(oldest);
  }
  const duration = action ? ACTION_NOTIFICATION_DURATION_MS : NOTIFICATION_DURATION_MS;
  const entry = { scope, operationId, title, kind, duration, focused: active.get(id)?.focused ?? false };
  active.set(id, entry);
  const retire = () => { if (active.get(id) === entry) active.delete(id); };
  toast[kind](title, {
    id,
    toasterId: APP_TOASTER_ID,
    testId: id,
    description,
    duration: entry.focused ? Infinity : duration,
    action: action ? {
      label: action.label,
      onClick: () => {
        if (!isCurrent(scope) || suppressedBy.size || invalidatedOperations.has(operationId) || active.get(id) !== entry) return;
        retire();
        action.onClick();
      },
    } : undefined,
    onDismiss: retire,
    onAutoClose: retire,
  });
  return id;
}

/** Deletion/cancellation also prevents a delayed result from resurrecting the same operation. */
export function dismissNotification(scope: NotificationScope | null, operationId: string) {
  if (!isCurrent(scope)) return;
  invalidatedOperations.add(operationId);
  deferred.delete(operationId);
  const id = toastId(scope, operationId);
  active.delete(id);
  toast.dismiss(id);
}

/** Sonner pauses on hover/hidden document. Tab focus gets a full reading window after blur. */
export function setNotificationFocused(id: string, focused: boolean) {
  const entry = active.get(id);
  if (!entry || !isCurrent(entry.scope) || suppressedBy.size) return;
  entry.focused = focused;
  toast[entry.kind](entry.title, { id, toasterId: APP_TOASTER_ID, duration: focused ? Infinity : entry.duration });
}
