'use client';

import { useState } from 'react';
import { BookOpen, Languages, Sparkles } from 'lucide-react';
import IOSFeatureDialog from '@/components/ui/ios-feature-dialog';
import { IOSAction, IOSActionDivider, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSIconFeatureListItem from '@/components/ui/ios-icon-feature-list-item';
import { joinWaitlist } from '@/lib/api';
import { trackUpgradeClicked } from '@/lib/posthog';

interface TranslationLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  /**
   * The enforced per-period cap that blocked the user (from GET /api/translation-limit).
   * Used verbatim in the copy so it always matches the backend; falls back to `freeLimit`.
   */
  limit?: number | null;
  /** ISO timestamp the current period resets; when present, shown as "resets on …". */
  periodEndsAt?: string | null;
  /** Fallback free-plan cap when `limit` is unavailable (defaults to 2). */
  freeLimit?: number;
  /** Premium cap for the upsell copy (defaults to 6). */
  premiumLimit?: number;
  /** Rolling-period length for the copy (defaults to 30). */
  periodDays?: number;
}

function formatResetDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const PREMIUM_BENEFITS = [
  { icon: BookOpen, text: 'Read more books in translation each month' },
  { icon: Languages, text: 'Keep reading across all supported languages' },
  { icon: Sparkles, text: 'Early access to upcoming translation improvements' },
];

// Mock status: 'upgrade' shows the coming-soon note in place of a real checkout.
type Status = 'idle' | 'loading' | 'success' | 'error' | 'upgrade';

export default function TranslationLimitDialog({
  open,
  onOpenChange,
  userEmail,
  limit,
  periodEndsAt,
  freeLimit = 2,
  premiumLimit = 6,
  periodDays = 30,
}: TranslationLimitDialogProps) {
  const [status, setStatus] = useState<Status>('idle');
  // Prefer the backend-enforced cap so the copy never drifts from what's applied.
  const effectiveLimit = limit ?? freeLimit;
  const resetDate = formatResetDate(periodEndsAt);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setStatus('idle');
    onOpenChange(nextOpen);
  };

  // Mock: a real Premium checkout (payment provider) is wired in later.
  const handleUpgrade = () => {
    trackUpgradeClicked({ source: 'limit_dialog' });
    setStatus('upgrade');
  };

  const handleSendRequest = async () => {
    setStatus('loading');
    try {
      await joinWaitlist(userEmail);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const title =
    status === 'success' ? 'Request Sent'
    : status === 'upgrade' ? 'Premium Is Almost Here'
    : 'Translation Limit Reached';

  const description =
    status === 'success' ? (
      <span>
        Your request has been sent. We&apos;ll reach out to{' '}
        <span className="font-medium">{userEmail}</span> soon.
      </span>
    ) : status === 'upgrade' ? (
      <span>
        Premium checkout is coming soon. We&apos;ll let you know the moment it&apos;s ready —
        in the meantime you can request expanded access and we&apos;ll contact you at{' '}
        <span className="font-medium">{userEmail}</span>.
      </span>
    ) : (
      <span>
        The free plan covers {effectiveLimit} books every {periodDays} days.{' '}
        {resetDate ? <>Your access resets on {resetDate}. </> : null}
        Upgrade to Premium for {premiumLimit} books, or request expanded access and we&apos;ll
        contact you at <span className="font-medium">{userEmail}</span>.
        {status === 'error' ? (
          <span className="mt-2 block text-destructive">
            Something went wrong. Please try again.
          </span>
        ) : null}
      </span>
    );

  const footer =
    status === 'success' || status === 'upgrade' ? (
      <IOSActionStack>
        {status === 'upgrade' ? (
          <>
            <IOSAction emphasized onClick={handleSendRequest}>
              Request Access
            </IOSAction>
            <IOSActionDivider />
            <IOSAction onClick={() => handleOpenChange(false)}>Not Now</IOSAction>
          </>
        ) : (
          <IOSAction emphasized onClick={() => handleOpenChange(false)}>
            Done
          </IOSAction>
        )}
      </IOSActionStack>
    ) : (
      <IOSActionStack>
        <IOSAction emphasized onClick={handleUpgrade} disabled={status === 'loading'}>
          Upgrade to Premium
        </IOSAction>
        <IOSActionDivider />
        <IOSAction onClick={handleSendRequest} disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending...' : 'Request Access Instead'}
        </IOSAction>
        <IOSActionDivider />
        <IOSAction onClick={() => handleOpenChange(false)} disabled={status === 'loading'}>
          Not Now
        </IOSAction>
      </IOSActionStack>
    );

  return (
    <IOSFeatureDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      footer={footer}
    >
      {status !== 'success' ? (
        <ul className="space-y-3 text-left">
          {PREMIUM_BENEFITS.map(({ icon: Icon, text }) => (
            <IOSIconFeatureListItem key={text} icon={Icon}>
              {text}
            </IOSIconFeatureListItem>
          ))}
        </ul>
      ) : null}
    </IOSFeatureDialog>
  );
}
