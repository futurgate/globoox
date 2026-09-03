# Error and Fallback Implementation Plan

## Scope
- In scope: items `1, 2, 3, 4, 6, 7` below.
- Out of scope for now:
  - Item `5` (no changes required for empty `available_languages`).
  - Item `8` (do not change `Store` yet).

## Global UX Rules
- All user-facing copy must stay in English.
- For server-side API failures (`502`, `503`) show:
  - Title: `Server unavailable`
  - Actions:
    - `Retry`
    - `Contact support` (`mailto:lomovski@gmail.com`)
- For action-level failures (hide/delete/chapter fallback), show toast notifications.

## 1) Forgot Password: New Password Screen (UI-only)
### Goal
After email reset flow, user lands on a page to set a new password instead of being sent back to login with a generic failure.

### Plan
1. Add new route page: `src/app/auth/reset-password/page.tsx`.
2. Build client form:
   - `New password`
   - `Confirm password`
   - basic validation (match + min length)
3. Use Supabase client session recovery state and call password update from client.
4. On success:
   - show success message
   - CTA to sign in (or automatic redirect to `/auth`)
5. Keep this page standalone (no backend changes).

### Acceptance
- User can open reset page from magic link session and submit new password.
- User sees clear success/error states on the page.

## 2) Reader: Missing Demo Book UX
### Goal
If demo book ID does not resolve, show a demo-specific message and return path to Store.

### Plan
1. Update `src/app/reader/[id]/page.tsx` not-found state copy:
   - Title: `Demo is currently unavailable`
   - Description: short explanation.
2. Replace/augment primary navigation button:
   - `Back to Store` (`/store`)
3. Keep the generic not-found fallback for non-demo contexts if needed, but demo path should have Store recovery.

### Acceptance
- Missing demo no longer dead-ends at generic `Book not found`.

## 3) Hide/Delete: Try/Catch + Toast
### Goal
Hide/Delete failures are visible to users and do not fail silently.

### Plan
1. Wrap `hideBook` and `removeBook` calls with `try/catch` at call site or hook level.
2. On failure show toast:
   - `Failed to complete action. Please try again.`
3. Keep optimistic removal only on success.

### Acceptance
- Failed hide/delete shows toast and item remains in list.

## 4) Library/Reader API Error Screens (502/503)
### Goal
For backend outage/config issues, show actionable screen instead of raw text error.

### Plan
1. Detect server-unavailable errors in API layer (`502/503`).
2. In `Library` and `Reader`, render a dedicated error state component:
   - Title: `Server unavailable`
   - Body: short explanation
   - Buttons:
     - `Retry` (re-run fetch)
     - `Contact support` (`mailto:lomovski@gmail.com`)
3. Keep existing inline error for non-availability errors if useful.

### Acceptance
- When backend is down/unconfigured, both pages show the same recovery UI.

## 6) Invalid Saved Progress Chapter -> Fallback + Toast
### Goal
If saved chapter no longer exists, jump to nearest previous available chapter (down to chapter 1) and notify user.

### Plan
1. In reader chapter initialization after chapters load:
   - If saved chapter exists: use it.
   - If missing: find nearest lower existing chapter index.
   - If none: use first chapter.
2. Show toast:
   - `Saved chapter was not found. We moved you to the nearest available chapter.`
3. Persist corrected progress.

### Acceptance
- Reader always opens on a valid chapter.
- User gets explicit feedback when fallback happens.

## 7) Profile Settings/Help -> "Soon" Pill
### Goal
Avoid fake-click dead ends for unfinished sections.

### Plan
1. In `src/app/profile/page.tsx`, keep `Settings` and `Help & Support` labels.
2. Add non-interactive `Soon` pill badge next to each.
3. Remove click affordance (or disable button interaction).

### Acceptance
- User clearly sees features are upcoming, not broken.

## Suggested Delivery Order
1. Item 4 (shared error pattern, highest support impact)
2. Item 3 (silent failure fix)
3. Item 2 (demo dead-end)
4. Item 6 (progress resilience)
5. Item 1 (reset password page)
6. Item 7 (profile polish)

## QA Checklist
- Simulate backend offline: Library/Reader show `Server unavailable` + both actions.
- Simulate hide/delete failure: toast appears, list is unchanged.
- Open reader with invalid saved chapter: fallback and toast appear.
- Missing demo link: user gets Store-safe recovery path.
- Reset-password page validates, updates password, and shows completion state.
- Profile page displays `Soon` pills for Settings and Help.
