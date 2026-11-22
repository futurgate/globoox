// Route segment config lives in this server layout because `export const dynamic`
// is not reliably honored from the `'use client'` page module under Turbopack 16.
// Opting the admin-only cost-lab segment out of static prerender avoids the Next 16
// prerender crash ("Invariant: Expected workUnitAsyncStorage to have a store") that
// surfaced on the constrained Vercel builder.
export const dynamic = 'force-dynamic';

export default function CostLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
