'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import { IOSAction, IOSActionRow, IOSActionVerticalDivider } from '@/components/ui/ios-action-group';
import styles from './StudioDraftActions.module.css';

const leaveEvent = 'studio:leave-draft';

export function withStudioDraftGuard(proceed: () => void) {
  const event = new CustomEvent(leaveEvent, { cancelable: true, detail: proceed });
  if (window.dispatchEvent(event)) proceed();
}

type Props = {
  dirty: boolean;
  busy: boolean;
  disabled?: boolean;
  inDialog?: boolean;
  error?: string;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
};

export function StudioDraftLeaveGuard({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  const [leave, setLeave] = useState(false);
  const continuation = useRef<(() => void) | null>(null);
  const leaving = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function intercept(event: Event, proceed: () => void) {
      if (event.defaultPrevented || leaving.current) return;
      event.preventDefault();
      if (busy) return;
      continuation.current = proceed;
      setLeave(true);
    }
    function custom(event: Event) {
      intercept(event, (event as CustomEvent<() => void>).detail);
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || leaving.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (!['http:', 'https:'].includes(url.protocol) ||
          (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)) return;
      intercept(event, () => link.click());
      event.stopImmediatePropagation();
    }
    function traverse(event: Event) {
      if ((event as Event & { navigationType?: string }).navigationType !== 'traverse' || !event.cancelable || leaving.current) return;
      if (busy || !window.confirm('Выйти без сохранения изменений?')) event.preventDefault();
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    navigation?.addEventListener('navigate', traverse);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener(leaveEvent, custom);
    document.addEventListener('click', click, true);
    return () => {
      navigation?.removeEventListener('navigate', traverse);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener(leaveEvent, custom);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, busy]);

  return <IOSAlertDialog open={leave} onOpenChange={setLeave} showCancel title="Выйти без сохранения?"
      description="Изменения в этой форме будут потеряны." confirmLabel="Выйти без сохранения" cancelLabel="Продолжить редактирование"
      onConfirm={() => {
        const proceed = continuation.current;
        continuation.current = null;
        leaving.current = true;
        setLeave(false);
        proceed?.();
        window.setTimeout(() => { leaving.current = false; }, 0);
      }}/>;
}

export function StudioDraftActions({ dirty, busy, disabled, inDialog, error, onSave, onReset, saveLabel = 'Сохранить' }: Props) {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (inDialog || !dirty || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const position = () => {
      const inset = Math.max(0, document.documentElement.clientHeight - viewport.height - viewport.offsetTop);
      bar.current?.style.setProperty('--studio-keyboard-inset', inset + 'px');
    };
    position();
    viewport.addEventListener('resize', position);
    viewport.addEventListener('scroll', position);
    return () => { viewport.removeEventListener('resize', position); viewport.removeEventListener('scroll', position); };
  }, [dirty, inDialog]);
  if (!dirty && !busy) return null;
  return <>
    {inDialog ? <IOSDialogFooter>
      {error && <p role="alert" className="px-4 py-2">{error}</p>}
      <IOSActionRow>
        <IOSAction disabled={busy} onClick={onReset}>Сбросить изменения</IOSAction><IOSActionVerticalDivider/>
        <IOSAction emphasized disabled={busy || disabled} onClick={onSave}>{busy ? 'Сохраняем…' : saveLabel}</IOSAction>
      </IOSActionRow>
    </IOSDialogFooter> : <>
      <div aria-hidden className={styles.space}/>
      <section ref={bar} className={styles.bar} aria-label="Несохранённые изменения">
        <span role={error ? 'alert' : 'status'} className={styles.status}>{error || (busy ? 'Сохраняем…' : 'Есть несохранённые изменения')}</span>
        <Button type="button" variant="outline" disabled={busy} onClick={onReset}>Сбросить изменения</Button>
        <Button type="button" disabled={busy || disabled} onClick={onSave} aria-busy={busy}>
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden/>}{busy ? 'Сохраняем…' : saveLabel}
        </Button>
      </section>
    </>}
    <StudioDraftLeaveGuard dirty={dirty} busy={busy}/>
  </>;
}
