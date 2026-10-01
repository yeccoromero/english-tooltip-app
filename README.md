# English Tooltip — web app

Web app companion of the [English Tooltip](https://github.com/yeccoromero/english-tooltip) Chrome extension:
review and manage the vocabulary you save while reading. Independent project (own repo, own Supabase project, own Vercel project).

## Status
- [x] Phase 2: Supabase project + schema (`supabase/migrations/`) with Row Level Security (verified with two test users)
- [x] Phase 3: web app — login (Google + email link), dashboard (due / streak / today / total), flashcard review, library (search, delete, CSV export)
- [ ] Phase 4: extension ⇄ web app sync (the extension still stores words locally)

## Run it
```bash
cp .env.example .env.local     # Supabase URL + publishable key (public by design)
npm install
npm run dev                    # http://localhost:3000
```
Login needs, in the Supabase project (Authentication):
- **Providers → Google**: enabled with a Google OAuth client whose redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
- **URL Configuration → Redirect URLs**: `http://localhost:3000/**` (add the production URL when you deploy).
- Email link login works without extra setup.

## Deploy (Vercel)
Import the repo at https://vercel.com/new (framework: Next.js, nothing to change). Add these in **Settings → Environment Variables** for Production, Preview and Development, then redeploy (`NEXT_PUBLIC_*` values are baked into the client bundle at build time, so changing them needs a new deployment):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your Supabase publishable key |

Then add the Vercel URL in Supabase → Authentication → URL Configuration (**Site URL** and **Redirect URLs**: `https://<your-app>.vercel.app/**`).

## Scripts
| | |
|---|---|
| `npm test` | unit tests (review scheduling, streak, CSV) |
| `npm run typecheck` | TypeScript |
| `npm run test:e2e` | end-to-end in Chromium against a **fake Supabase** (auth + PostgREST) started by the script; no network needed |

## How it works
- Next.js 16 (App Router). `proxy.ts` (the new name of `middleware.ts`) refreshes the Supabase session and sends signed-out visitors to `/login`.
- Server Components read data with the user's own session; Row Level Security limits every query to the user's rows. Only the public publishable key is used — there is no service key.
- Review uses Leitner boxes (1, 2, 4, 8, 16, 32 days), the same schedule as the extension, so both sides stay consistent once they sync. Missed cards return later in the same session. Each answer updates `words` and inserts a `review_logs` row.
- Streak and "today" are computed in the browser so they follow your timezone.
- Deleting a word is a soft delete (`deleted_at`) so the deletion can sync to the extension in phase 4.

## Data model
- `words`: one row per (user, word). `updated_at` (client clock) resolves conflicts; `synced_at` (server clock, set by trigger) drives incremental pulls.
- `review_logs`: one row per review answer.
- `anon` sees nothing.
