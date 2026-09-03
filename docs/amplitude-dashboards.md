# Amplitude Analytics — Event Taxonomy & Dashboard Setup

## Event Taxonomy

All events are tracked via the Amplitude CDN SDK initialized in `layout.tsx`.
Custom event functions live in `src/lib/amplitude.ts`.

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

### Auto-captured by Amplitude SDK

The SDK autocaptures: `page_view`, `session_start`, `session_end`, `[Amplitude] File Downloaded`, `[Amplitude] Form Started`, `[Amplitude] Form Submitted`, `[Amplitude] Element Clicked`, network requests, web vitals, frustration signals (rage clicks, dead clicks).

---

## Dashboard 1: Executive Overview (North Star)

**Goal:** High-level health and growth of the app.

### How to create in Amplitude

Go to **Dashboards → Create Dashboard → "North Star"** and add the following charts:

---

### Chart 1 — Daily & Monthly Active Users

**Type:** Line Chart
**Metric:** Unique Users
**Event filter:** `reading_session_started` OR `translation_batch_sent`
**Group by:** _(none)_
**Date range:** Last 90 days
**Interval:** Daily

Add a second series for MAU:
- Same event filter
- **Measured over:** 30-day rolling window

> **Rationale:** DAU/MAU counts users who actively read or translate — not just those who log in.

---

### Chart 2 — N-Day Retention Curve

**Type:** Retention Analysis
**Starting event:** `reading_session_started` (first time = "new user" cohort)
**Returning event:** `reading_session_started`
**Retention type:** N-Day (Day 1, Day 7, Day 30)
**Date range:** Last 60 days

> Shows what % of users who started their first reading session return on Day 1, 7, and 30.

---

### Chart 3 — Books Read & Chapters Completed Over Time

**Type:** Line Chart
**Series 1:** Unique `book_opened` events per day
**Series 2:** Total `chapter_completed` events per day
**Date range:** Last 90 days
**Interval:** Daily

---

### Chart 4 — Translation Requests by Language (Stacked Bar)

**Type:** Bar Chart (Stacked)
**Event:** `translation_batch_sent`
**Metric:** Event totals (sum of `block_count` property — use Formula: `PROPSUM(block_count)`)
**Group by:** `language`
**Date range:** Last 30 days
**Interval:** Weekly

> Shows volume of translated blocks per language (EN, FR, ES, DE, RU).

---

## Dashboard 2: Reading Engagement & Feature Adoption

**Goal:** Understand how users interact with the core reading experience.

### How to create in Amplitude

Go to **Dashboards → Create Dashboard → "Engagement"** and add the following charts:

---

### Chart 1 — Average Reading Session Duration

**Type:** Line Chart
**Event:** `reading_session_ended`
**Metric:** Average of property `duration_seconds`
  - In Amplitude: use **Formulas → PROPAVG(duration_seconds)**
**Date range:** Last 30 days
**Interval:** Daily

> Tracks average time (seconds) per reading session. Convert to minutes in the chart title.

---

### Chart 2 — Reading Funnel

**Type:** Funnel Analysis
**Steps (in order):**
1. `[Amplitude] Page Viewed` — filter where `page_path` contains `/library` or `/store`
2. `book_opened`
3. `reading_session_started`
4. `chapter_completed` _(at least once)_
5. `book_finished`

**Conversion window:** 7 days
**Date range:** Last 30 days

> Shows drop-off from browsing → opening a book → starting to read → completing a chapter → finishing a book.

---

### Chart 3 — Feature Usage (Uploads vs. Store)

**Type:** Pie Chart
**Series 1:** `book_uploaded` — label: "User Uploads"
**Series 2:** `book_opened` where `source = 'store'` — label: "From Store"
**Date range:** Last 30 days

Add a second pie (or use a stacked bar) for translation mode:
**Series 1:** `translation_batch_sent` — total events — label: "Translated reads"
**Series 2:** `reading_session_started` total minus `translation_batch_sent` unique users — label: "Original language reads"

---

### Chart 4 — Settings Adjustments

**Type:** Bar Chart
**Series 1:** `font_size_changed` — event count
**Series 2:** `language_switched` — event count
**Group by:** _(none for counts, or group `font_size_changed` by `font_size` to see popular sizes)_
**Date range:** Last 30 days

Optional breakdown:
- `language_switched` grouped by `to_language` → pie chart of preferred reading languages

---

## Dashboard 3: UTM Acquisition Segmentation

**Goal:** Understand which acquisition channels drive the most engaged users.

### How to create

Go to **Dashboards → Create Dashboard → "Acquisition"**.

All charts in this dashboard use the **user property** `first_utm_source` (and other `first_utm_*` properties) as a segmentation dimension. These are set as permanent user properties on first visit via `amplitude.Identify.setOnce()` — meaning they never change even if a user later visits from a different channel.

### User Properties Available

| Property | Set by | Description |
|----------|--------|-------------|
| `first_utm_source` | `captureFirstVisitUtm()` | e.g. `google`, `facebook`, `newsletter` |
| `first_utm_medium` | `captureFirstVisitUtm()` | e.g. `cpc`, `email`, `social` |
| `first_utm_campaign` | `captureFirstVisitUtm()` | e.g. `summer_promo` |
| `first_utm_content` | `captureFirstVisitUtm()` | Ad variant / creative |
| `first_utm_term` | `captureFirstVisitUtm()` | Paid keyword |
| `first_landing_page` | `captureFirstVisitUtm()` | URL path on first visit |
| `email` | `identifyUser()` | User email (set on login) |

> **Note:** Users without UTM params on first visit will have these properties unset. In Amplitude charts, unset = `(none)` — this represents direct/organic traffic.

---

### Chart 1 — Signups by Acquisition Channel

**Type:** Bar Chart
**Event:** `user_signed_up`
**Group by:** User property → `first_utm_source`
**Date range:** Last 90 days

---

### Chart 2 — Retention by Channel (Comparison)

**Type:** Retention Analysis
**Starting event:** `reading_session_started`
**Returning event:** `reading_session_started`
**Segment 1:** User property `first_utm_source = 'google'`
**Segment 2:** User property `first_utm_source = 'facebook'`
**Segment 3:** No UTM (direct) — `first_utm_source` does not exist
**Date range:** Last 60 days

> Lets you compare Day-7 retention of paid vs. organic users.

---

### Chart 3 — Activation Rate by Channel

**Type:** Funnel
**Steps:**
1. `user_signed_up`
2. `book_uploaded` (first book = activation)

**Group by:** User property → `first_utm_source`
**Date range:** Last 30 days

---

### Chart 4 — Revenue-Proxy by Channel (Translation Volume)

**Type:** Bar Chart (Stacked)
**Event:** `translation_batch_sent`
**Metric:** PROPSUM(`block_count`) — total blocks translated per channel
**Group by:** User property → `first_utm_medium`
**Date range:** Last 30 days

> Higher translation volume = more engaged users. Use this to evaluate channel quality beyond signups.

---

## Cohort Definitions (for Retention & DAU)

Create these cohorts in **Audiences → Cohorts** for reuse across dashboards:

| Cohort Name | Definition |
|-------------|-----------|
| **Active Readers** | Performed `reading_session_started` in last 30 days |
| **Translating Users** | Performed `translation_batch_sent` in last 30 days |
| **Activated Users** | Performed `book_uploaded` at least once (ever) |
| **Book Finishers** | Performed `book_finished` at least once (ever) |

---

## Tips for Amplitude Setup

1. **Property schema:** Go to **Data → Properties** and mark all custom properties as "Verified" with correct types:
   - `duration_seconds` → Number
   - `block_count`, `cache_hits`, `cache_misses`, `duration_ms` → Number
   - `chapter_index`, `total_chapters`, `file_size_kb`, `font_size` → Number
   - `language`, `from_language`, `to_language`, `method`, `source` → String

2. **User identity:** `AmplitudeProvider` sets `amplitude.setUserId(supabase_user_id)` on login and calls `amplitude.reset()` on logout. This ensures "Unique Users" in charts = real accounts, not device IDs. It also merges pre-login anonymous events with the identified user.

3. **UTM user properties:** Verify the `first_utm_*` properties exist in **Data → User Properties** after the first UTM-tagged visit. They should appear with type String.

4. **Session replay:** Already enabled at 100% sample rate in `layout.tsx`. Use it to watch rage-click or funnel drop-off sessions in context.

5. **Slack / email alerts:** Set up monitors on `book_upload_failed` error spikes and `reading_session_ended` duration drops via **Amplitude Monitoring**.
