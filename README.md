# English Tooltip — web app

Web app companion of the [English Tooltip](https://github.com/yeccoromero/english-tooltip) Chrome extension:
review and manage the vocabulary you save while reading. Independent project (own repo, own Supabase project, own Vercel project).

## Status
- [x] Phase 2: Supabase project + schema (`supabase/migrations/`) with Row Level Security (verified with two test users)
- [ ] Phase 3: web app (login, library, flashcards, dashboard)
- [ ] Phase 4: extension ⇄ web app sync

## Data model
- `words`: one row per (user, word). Soft delete (`deleted_at`). `updated_at` (client clock) resolves conflicts; `synced_at` (server clock, set by trigger) drives incremental pulls.
- `review_logs`: one row per review answer (for streaks and stats).
- RLS: users only read/write their own rows; `anon` sees nothing.

## Setup
Copy `.env.example` to `.env.local`. Auth: email magic link works out of the box; Google login needs an OAuth client configured in the Supabase dashboard (Authentication → Providers → Google).
