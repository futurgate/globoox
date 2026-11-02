'use client';

import type { MouseEvent, ReactNode } from 'react';

interface BusinessEmailButtonProps {
  children: ReactNode;
  className?: string;
  intent?: 'contact' | 'trial';
}

export function BusinessEmailButton({ children, className, intent = 'contact' }: BusinessEmailButtonProps) {
  const openEmail = (event: MouseEvent<HTMLButtonElement>) => {
    // Reject synthetic DOM clicks, while keeping native mouse, touch and keyboard activation.
    // This is not a human-verification boundary: browser automation can produce trusted events.
    if (!event.nativeEvent.isTrusted) return;

    // Keep a literal address/mailto out of server HTML and passive DOM scraping.
    // The parts remain recoverable from client JavaScript; this is only light obfuscation.
    const mailbox = 'lomovski';
    const domain = ['globoox', 'co'].join('.');
    const recipient = [mailbox, domain].join('@');
    const subject = intent === 'trial'
      ? 'Бесплатный пробный перевод — Globoox'
      : 'Перевод и публикация книги — Globoox';
    const link = document.createElement('a');
    link.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;
    link.click();
  };

  return <button type="button" className={className} onClick={openEmail}>{children}</button>;
}
