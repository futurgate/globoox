# Reader Typography Adaptive Layout Plan

## Context
Current reader pagination quality depends on exact geometry matching between measurement (`probe`) and visible render.
When layout changes (single page vs spread, language switch, font size change), readability can degrade because the same text may produce different line breaks.

The product goal is not only “pixel fit” but consistent reading comfort across:
- different languages (word length and morphology differ),
- different fonts and font sizes,
- different viewport widths (especially desktop spread mode).

## Core Idea
Use a typography-driven target for column width based on language and current font metrics.

Important distinction:
- UX target: comfortable words per line.
- Engine control: pixel width.

So we define readability targets in words-per-line ranges, then convert to pixel width with runtime font measurement.

## Why This Is Useful
- Better cross-language readability (RU/DE often need different effective width than EN/FR/ES).
- Stable reading feel when user changes font size or language.
- Better desktop experience for large displays (user can increase font/column width without losing fit quality).
- Reduced layout drift between “what we paginate” and “what user sees”.

## Non-Goals
- No full TeX-like global optimization.
- No heavy NLP per page.
- No aggressive automatic user-setting overrides without limits.

## Proposed Model

### 1. Language Readability Profile
Define per-language target ranges:
- `targetWordsPerLineMin`
- `targetWordsPerLineMax`
- optional `preferredWordsPerLine`

Example initial presets (tunable):
- `ru`: 8–12
- `de`: 8–12
- `en`: 9–14
- `fr`: 9–14
- `es`: 9–14

### 2. Runtime Font Measurement
For active language + current font settings:
- sample representative words from current chapter (or cached samples by language),
- measure average token width with `canvas.measureText`,
- derive estimated pixel width for preferred words-per-line.

Output:
- `preferredColumnWidthPx`
- `minColumnWidthPx`
- `maxColumnWidthPx`

### 3. Column Width Resolution
Given viewport width:
1. Try `preferredColumnWidthPx`.
2. Clamp to `[minColumnWidthPx, maxColumnWidthPx]`.
3. In spread mode, require two columns + gap to fit.
4. If not fitting:
- first compress toward `minColumnWidthPx`,
- then (optional) reduce font size within safe bounds,
- else fall back to single-page mode.

### 4. Safe Font Auto-Fit (Optional, controlled)
Only if enabled:
- allow font-size adjustment in small bounded range (for example, at most `-2px` from user selection),
- never override user setting beyond configured limit,
- surface this behavior in UI copy.

## Architecture Changes

### A. Single Source Of Geometry Truth
Create one reusable page shell component/class used by:
- hidden measurement probe,
- single page render,
- each spread page.

No alternative width constraints in spread wrappers.

### B. Readability Engine Module
Add a lightweight module, e.g.:
- `src/lib/reader/readabilityProfile.ts`
- `src/lib/reader/columnWidthResolver.ts`

Responsibilities:
- per-language presets,
- runtime text metric sampling,
- final width and mode decision.

### C. Settings Extensions (optional)
Add user-facing controls later:
- `readabilityMode`: `strict` | `balanced` | `wide`
- `autoFitFont`: boolean

Keep default behavior conservative.

## Rollout Plan

### Phase 1: Geometry Integrity (must-have)
1. Keep page shell identical between probe/single/spread.
2. Remove duplicate width constraints in spread wrappers.
3. Add debug assertion tooling for width parity (single vs spread page content box).

Success criteria:
- same chapter/page produces same line breaks single vs spread for equal effective width.

### Phase 2: Language Profiles + Width Resolver
1. Add language presets.
2. Add runtime metric sampling.
3. Resolve preferred/min/max column widths.
4. Wire resolver to spread activation and column width.

Success criteria:
- improved perceived readability in RU/DE/EN manual checks,
- no increased overflow regressions.

### Phase 3: Optional Auto-Fit Font
1. Add bounded font auto-fit in constrained viewports.
2. Add telemetry for auto-fit events and fallback-to-single events.
3. Add user preference toggle if needed.

Success criteria:
- reduced “text too dense/too cramped” feedback,
- no surprise large setting jumps.

## Telemetry
Track:
- `reader_layout_resolved`:
  - language, fontSize, preferredWidthPx, resolvedWidthPx, mode(single/spread), fallbackReason.
- `reader_spread_disabled_due_to_width`
- `reader_autofit_applied`

This helps tune presets by real usage.

## Risks
- Overfitting presets to one content style.
- Performance overhead from repeated text metrics.
- User frustration if auto-fit feels uncontrollable.

Mitigations:
- cache measurements per `(language, font family, font size)`,
- recompute only on relevant changes,
- keep auto-fit bounded and transparent.

## Open Questions
1. Should auto-fit be opt-in or default-on?
2. Should profiles vary only by language, or by language + script + genre?
3. Do we prioritize strict line-length consistency or preserving user-selected font-size exactly?

## Recommended First Implementation
Start with:
- geometry integrity + language-aware width resolver,
- no automatic font-size changes yet,
- telemetry enabled.

This delivers most of the benefit with low behavioral risk.
