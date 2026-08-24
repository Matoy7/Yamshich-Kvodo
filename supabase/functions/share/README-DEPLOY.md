# Deploying the `share` Edge Function

This function is what makes shared links show a real preview on WhatsApp,
Facebook, Telegram, LinkedIn, X, Slack, etc. Nothing in this repo can deploy
it automatically — Edge Functions are deployed with the Supabase CLI, logged
into your own account, from your own machine.

**Until this is deployed, sharing still works** (copy link, native share,
WhatsApp, the deep-link page itself) — the copied link just falls back to the
plain `matoy7.github.io/Yamshich-Kvodo/...` URL, which a human opens exactly
as before. What you don't get without this function is a rich preview card
when the link is *pasted* somewhere — that specific piece genuinely requires
a server, which GitHub Pages cannot provide (see the long comment at the top
of `index.ts` for why).

## One-time setup

```bash
# If you don't have it yet
npm install -g supabase

# From the repo root
supabase login
supabase link --project-ref <your-project-ref>   # the xxxxxxxx in https://xxxxxxxx.supabase.co
```

## Deploy

```bash
supabase functions deploy share
```

That's it — this reads everything from `supabase/functions/share/index.ts`.

## Configuration

Two environment variables the function needs are populated **automatically**
by Supabase for every Edge Function — nothing to do for these:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — used here (server-side only, never shipped to
  the browser) to read sentences/completions/likes without going through
  RLS, since crawlers never have a session at all.

One more you should set once, so the function knows where to send real
visitors:

```bash
supabase secrets set SITE_ORIGIN=https://matoy7.github.io/Yamshich-Kvodo
```

(If you don't set this, it defaults to that exact value already, so this
step is optional unless the repo or custom domain ever changes.)

## Verifying it worked

```bash
# Pretend to be a crawler — should return HTML with real <meta property="og:..."> tags
curl -A "facebookexternalhit/1.1" \
  "https://<your-project-ref>.supabase.co/functions/v1/share/sentence/<a-real-sentence-id>/completion/<a-real-completion-id>"

# Pretend to be a normal browser — should return a 302 to matoy7.github.io
curl -I -A "Mozilla/5.0" \
  "https://<your-project-ref>.supabase.co/functions/v1/share/sentence/<a-real-sentence-id>/completion/<a-real-completion-id>"

# The dynamic image itself
curl -o preview.png \
  "https://<your-project-ref>.supabase.co/functions/v1/share/og-image/<a-real-sentence-id>/<a-real-completion-id>.png"
```

Real end-to-end confirmation: paste a real share link into
[Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
or [Twitter Card Validator](https://cards-dev.twitter.com/validator) and
check the preview it renders.

## Why the copied link points at supabase.co, not matoy7.github.io

The app's own `buildEdgeShareUrl` (in `src/lib/deepLink.ts`) builds links
against this function's URL once `VITE_SUPABASE_URL` is set at build time —
which it already is, for the app itself to work at all. **No separate
configuration is needed on the frontend side** once this function is
deployed; the link a person copies is automatically the right one.

A human clicking that link is redirected to the real app within a single hop
and never sees this function's own page — this is only about what a crawler
sees when the link is pasted somewhere, before anyone has clicked it.

## Local testing (optional)

```bash
supabase functions serve share --no-verify-jwt
curl -A "WhatsApp" "http://localhost:54321/functions/v1/share/sentence/<id>/completion/<id>"
```
