---
type: postmortem
status: incomplete
owner: engineering
date: 2026-03-08
last_verified: 2026-09-01
---

# Incident: Supabase new-user creation returned DB-side 500

## Confirmed symptom

Both admin user creation and public signup returned database-side `500` errors while existing-user login could still work.

## Confirmed evidence

- `profiles` and `sync_metadata` existed and responded through service-role access.
- The 11 observed auth users each had matching `profiles` and `sync_metadata` rows, showing that the basic trigger chain had worked historically.
- Live `sync_metadata` lacked `translations_updated_at` even though a repository migration expected it. Live schema drift was therefore confirmed.
- The repository versions of `handle_new_user()` and the profile-to-sync upsert did not show an obvious failure by inspection alone.

## Unknown root cause

The available audit does not prove that the missing translation timestamp caused signup failure. It also does not prove that `handle_new_user`, `sync_metadata`, a policy, another trigger, or an out-of-repository database object was responsible.

## Required follow-up

1. Export live `profiles` and `sync_metadata` schemas.
2. Export trigger definitions on `auth.users` and `profiles`.
3. Export the live bodies of `handle_new_user` and `update_sync_settings`.
4. Compare them with the backend repository and migration history.
5. Record the actual minimal fix and close this incident only after a new-user test succeeds.

## Source

[Original audit checklist](04-supabase-signup-audit-checklist.md)
