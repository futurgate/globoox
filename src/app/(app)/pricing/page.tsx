import { redirect } from 'next/navigation';

// The standalone pricing page is hidden for now — plan management lives in Settings.
// The previous LemonSqueezy pricing UI is preserved in `pricing-future.tsx` for the
// future Pro (unlimited) plan.
export default function PricingPage() {
  redirect('/settings');
}
