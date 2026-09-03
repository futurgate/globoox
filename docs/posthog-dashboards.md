# PostHog Analytics — Event Taxonomy & Dashboard Setup

## Event Taxonomy

All events are tracked via `posthog-js` initialized in `instrumentation-client.ts`.
Custom event functions live in `src/lib/posthog.ts`.

### User Acquisition & Auth

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `user_signed_up` | `method: 'email' \| 'google'` | `auth/register/page.tsx` |
| `user_logged_in` | `method: 'email' \| 'google'` | `auth/page.tsx` |

> **Note:** Google events fire on OAuth initiation (before redirect). Email events fire after successful server response.

### Book Lifecycle

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `book_upload_started` | `file_size_kb` | `UploadBookModal.tsx` |
| `book_uploaded` | `title, author, language, chapter_count, file_size_kb` | `UploadBookModal.tsx` |
| `book_upload_failed` | `error, file_size_kb` | `UploadBookModal.tsx` |
| `book_opened` | `book_id, title, source: 'library' \| 'store'` | `library/page.tsx` via `BookCard.tsx` |

### Reading Session

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `reading_session_started` | `book_id, chapter_index, language` | `ReaderView.tsx` (mount) |
| `reading_session_ended` | `book_id, duration_seconds, pages_read, chapters_navigated` | `ReaderView.tsx` (unmount) |
| `chapter_completed` | `book_id, chapter_index, total_chapters` | `ReaderView.tsx` (chapter advance) |
| `book_finished` | `book_id, total_chapters` | `ReaderView.tsx` (last page of last chapter) |

### Translation

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `translation_batch_sent` | `book_id, chapter_id, language, block_count, cache_hits, cache_misses, duration_ms` | `useViewportTranslation.ts` |
| `language_switched` | `book_id, from_language, to_language` | `ReaderView.tsx` |

### Reader Settings

| Event | Properties | Where fired |
|-------|-----------|-------------|
| `font_size_changed` | `font_size, previous_font_size` | `ReaderSettings.tsx` (on slider release) |

### Auto-captured by PostHog SDK

With `defaults: '2026-01-30'` PostHog autocaptures: `$pageview`, `$pageleave`, `$autocapture` (clicks, inputs), UTM parameters on first visit, and session replay (if enabled in the PostHog project settings).

---

## Dashboard 1: Executive Overview (North Star)

**Goal:** High-level health and growth of the app.

Go to **Dashboards → New Dashboard → "North Star"** and add the following insights:

---

### Chart 1 — Daily & Monthly Active Users

**Type:** Trends
**Event:** `reading_session_started` or `translation_batch_sent`
**Aggregation:** Unique users
**Date range:** Last 90 days / Interval: Daily

Add a second series for MAU:
- Same event, **rolling 30-day** window unique users

> **Rationale:** DAU/MAU counts users who actively read or translate — not just those who log in.

---

### Chart 2 — N-Day Retention Curve

**Type:** Retention
**Starting event:** `reading_session_started` (first time = "new user" cohort)
**Returning event:** `reading_session_started`
**Retention type:** Retention on Day 1, Day 7, Day 30
**Date range:** Last 60 days

---

### Chart 3 — Books Read & Chapters Completed Over Time

**Type:** Trends
**Series 1:** `book_opened` — Unique users per day
**Series 2:** `chapter_completed` — Total count per day
**Date range:** Last 90 days / Interval: Daily

---

### Chart 4 — Translation Requests by Language (Stacked Bar)

**Type:** Trends
**Event:** `translation_batch_sent`
**Aggregation:** `Sum` of property `block_count`
**Breakdown:** by property `language`
**Date range:** Last 30 days / Interval: Weekly

---

## Dashboard 2: Reading Engagement & Feature Adoption

**Goal:** Understand how users interact with the core reading experience.

Go to **Dashboards → New Dashboard → "Engagement"**.

---

### Chart 1 — Average Reading Session Duration

**Type:** Trends
**Event:** `reading_session_ended`
**Aggregation:** `Average` of property `duration_seconds`
**Date range:** Last 30 days / Interval: Daily

> Tracks average time (seconds) per reading session.

---

### Chart 2 — Reading Funnel

**Type:** Funnel
**Steps (in order):**
1. `$pageview` — filter where `$current_url` contains `/library` or `/store`
2. `book_opened`
3. `reading_session_started`
4. `chapter_completed`
5. `book_finished`

**Conversion window:** 7 days
**Date range:** Last 30 days

---

### Chart 3 — Feature Usage (Uploads vs. Store)

**Type:** Trends
**Series 1:** `book_uploaded` — Total count — label "User Uploads"
**Series 2:** `book_opened` where `source = 'store'` — Total count — label "From Store"
**Date range:** Last 30 days

Translation mode breakdown:
- **Series 1:** `translation_batch_sent` — total events — label "Translated reads"

---

### Chart 4 — Settings Adjustments

**Type:** Trends
**Series 1:** `font_size_changed` — event count
**Series 2:** `language_switched` — event count
**Date range:** Last 30 days

Optional breakdown:
- `language_switched` with **Breakdown** by `to_language` → preferred reading languages

---

## Dashboard 3: UTM Acquisition Segmentation

**Goal:** Understand which acquisition channels drive the most engaged users.

Go to **Dashboards → New Dashboard → "Acquisition"**.

PostHog automatically captures UTM parameters as person properties (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) and sets `$initial_utm_source` etc. (prefixed with `$initial_`) on first visit — these never change even if the user returns from a different channel.

### Person Properties Available

| Property | Captured by | Description |
|----------|-------------|-------------|
| `$initial_utm_source` | PostHog autocapture | e.g. `google`, `facebook`, `newsletter` |
| `$initial_utm_medium` | PostHog autocapture | e.g. `cpc`, `email`, `social` |
| `$initial_utm_campaign` | PostHog autocapture | e.g. `summer_promo` |
| `$initial_utm_content` | PostHog autocapture | Ad variant / creative |
| `$initial_utm_term` | PostHog autocapture | Paid keyword |
| `$initial_referring_domain` | PostHog autocapture | Referring domain on first visit |
| `email` | `identifyUser()` in `PostHogProvider.tsx` | User email (set on login) |

> Users without UTM params on first visit will have these properties unset — this represents direct/organic traffic.

---

### Chart 1 — Signups by Acquisition Channel

**Type:** Trends
**Event:** `user_signed_up`
**Breakdown:** Person property `$initial_utm_source`
**Date range:** Last 90 days

---

### Chart 2 — Retention by Channel (Comparison)

**Type:** Retention
**Starting event:** `reading_session_started`
**Returning event:** `reading_session_started`
**Filter cohorts by person property:** `$initial_utm_source`
**Date range:** Last 60 days

---

### Chart 3 — Activation Rate by Channel

**Type:** Funnel
**Steps:**
1. `user_signed_up`
2. `book_uploaded`

**Breakdown:** Person property `$initial_utm_source`
**Date range:** Last 30 days

---

### Chart 4 — Engagement by Channel (Translation Volume)

**Type:** Trends
**Event:** `translation_batch_sent`
**Aggregation:** `Sum` of `block_count`
**Breakdown:** Person property `$initial_utm_medium`
**Date range:** Last 30 days

---

## Cohort Definitions

Create these cohorts in **People → Cohorts** for reuse across dashboards:

| Cohort Name | Definition |
|-------------|-----------|
| **Active Readers** | Performed `reading_session_started` in last 30 days |
| **Translating Users** | Performed `translation_batch_sent` in last 30 days |
| **Activated Users** | Performed `book_uploaded` at least once (ever) |
| **Book Finishers** | Performed `book_finished` at least once (ever) |

---

## Tips for PostHog Setup

1. **Property schema:** Go to **Data Management → Properties** and verify types:
   - `duration_seconds`, `block_count`, `cache_hits`, `cache_misses`, `duration_ms` → Numeric
   - `chapter_index`, `total_chapters`, `file_size_kb`, `font_size` → Numeric
   - `language`, `from_language`, `to_language`, `method`, `source` → String

2. **User identity:** `PostHogProvider` calls `posthog.identify(supabase_user_id, { email })` on login and `posthog.reset()` on logout. This merges pre-login anonymous events with the authenticated person.

3. **Session replay:** Enable in **PostHog project settings → Session replay**. Use it to watch funnel drop-off sessions in context.

4. **Alerts:** Set up **Alerts** on insights for `book_upload_failed` spikes and `reading_session_ended` duration drops via **Alerts** in each insight.

5. **Env vars:** Make sure `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are set in `.env.local` and your hosting provider (Vercel / Render).
