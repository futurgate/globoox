'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useEditorialLocale } from './EditorialLocale';
import { getEditorialPricingCopy } from './editorialPricingCopy';
import s from './BetaAccessDialog.module.css';

export default function BetaAccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useEditorialLocale();
  const copy = getEditorialPricingCopy(locale).beta;
  const dialog = useRef<HTMLDialogElement>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previousOverflow; };
  }, [open]);

  const close = () => {
    setOpening(false);
    onClose();
  };

  return <dialog
    ref={dialog}
    className={s.dialog}
    aria-labelledby="beta-access-title"
    aria-describedby="beta-access-description"
    onClose={(event) => {
      // A queued native close event must not dismiss a newly reopened dialog.
      if (!event.currentTarget.open) close();
    }}
    onCancel={close}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}
  >
    <button type="button" className={s.close} aria-label={copy.close} onClick={close}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
    <h2 id="beta-access-title" className={s.title}>{copy.title}</h2>
    <p id="beta-access-description" className={s.description}>{copy.description}</p>
    <Link href="/my-books" prefetch={false} className={s.continue} aria-busy={opening} onNavigate={() => setOpening(true)}>
      {opening && <span className={s.spinner} aria-hidden="true" />}
      <span>{opening ? copy.opening : copy.continue}</span>
    </Link>
    <span className={s.srOnly} role="status" aria-live="polite">{opening ? copy.opening : ''}</span>
    <button className={s.dismiss} type="button" onClick={close}>{copy.dismiss}</button>
  </dialog>;
}
