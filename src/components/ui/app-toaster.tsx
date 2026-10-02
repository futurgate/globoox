'use client';

import { useEffect, useState, type FocusEvent } from 'react';
import { usePathname } from 'next/navigation';
import { CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { createClient } from '@/lib/supabase/client';
import {
  APP_TOASTER_ID,
  MAX_VISIBLE_NOTIFICATIONS,
  NOTIFICATION_DURATION_MS,
  notificationIdentityChanged,
  setNotificationFocused,
} from '@/lib/notifications';
import './app-toaster.css';

function focusedToast(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('[data-sonner-toast]') : null;
}

export default function AppToaster() {
  const pathname = usePathname();
  const { mode } = useAppTheme();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [hasFocus, setHasFocus] = useState(false);
  const hasBottomNavigation = !pathname.startsWith('/reader') && !pathname.startsWith('/auth');

  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      notificationIdentityChanged(session?.user.id ?? null, event === 'SIGNED_OUT');
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    setHasFocus(true);
    const toast = focusedToast(event.target);
    if (toast && !toast.contains(event.relatedTarget as Node | null)) {
      setNotificationFocused(toast.dataset.testid!, true);
    }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false);
    const toast = focusedToast(event.target);
    if (toast && !toast.contains(event.relatedTarget as Node | null)) {
      setNotificationFocused(toast.dataset.testid!, false);
    }
  };
  const bottom = `calc(max(${keyboardInset}px, env(safe-area-inset-bottom, 0px) + ${hasBottomNavigation ? 60 : 0}px) + 16px)`;

  return (
    <div onFocusCapture={onFocus} onBlurCapture={onBlur}>
      <Toaster
        id={APP_TOASTER_ID}
        theme={mode}
        className="app-toaster"
        position="bottom-center"
        offset={{ bottom, left: 16, right: 16 }}
        mobileOffset={{ bottom, left: 16, right: 16 }}
        visibleToasts={MAX_VISIBLE_NOTIFICATIONS}
        expand={hasFocus}
        duration={NOTIFICATION_DURATION_MS}
        containerAriaLabel="Notifications"
        icons={{
          success: <CircleCheck size={20} aria-hidden="true" />,
          info: <Info size={20} aria-hidden="true" />,
          warning: <TriangleAlert size={20} aria-hidden="true" />,
          error: <CircleAlert size={20} aria-hidden="true" />,
        }}
      />
    </div>
  );
}
