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

## ⚠️ This function must be public — read this before deploying

Every Edge Function requires a valid Supabase JWT by default. `share` must
be the one exception: a crawler fetching a pasted link sends no
`Authorization` header at all, so a JWT-required `share` always fails with

```json
{ "code": "UNAUTHORIZED_NO_AUTH_HEADER", "message": "Missing authorization header" }
```

**before `index.ts` ever runs** — this happens at Supabase's gateway, in
front of the function, so nothing inside the function's own code can fix it.

`supabase/config.toml` in this repo already sets this correctly:

```toml
[functions.share]
verify_jwt = false
```

`supabase functions deploy share` reads this automatically — you don't need
to pass any extra flag. This is also what makes the setting *durable*: it's
config-as-code, so it can't silently reset on a future deploy the way a
Dashboard toggle can (see below).

**If you deployed by pasting code directly into the Supabase Dashboard's
function editor** rather than via the CLI, `config.toml` was never read at
all — the Dashboard editor doesn't look at this repo. Two options:

- **Fastest, no CLI**: open the [Supabase Dashboard](https://supabase.com/dashboard)
  → your project → **Edge Functions** → **share** → its settings/details
  panel has a **"Verify JWT"** toggle (sometimes labelled *"Verify JWT with
  legacy secret"*) — turn it **off**. Takes effect immediately, no
  redeploy needed.
  ⚠️ Supabase has a known behavior where this toggle can silently flip back
  **on** the next time the function is updated (via the Dashboard editor
  *or* the CLI) — see
  [supabase/supabase#43608](https://github.com/supabase/supabase/issues/43608).
  If crawler previews stop working again after any later edit to this
  function, check this toggle first.
- **Durable, one-time CLI use**: run the deploy steps below once. Since
  `config.toml` already has `verify_jwt = false`, this both fixes it and
  makes it stick — no `--no-verify-jwt` flag needed, and no more relying on
  a toggle that can reset itself.

## One-time setup

```bash
# If you don't have it yet
npm install -g supabase

# From the repo root
supabase login
supabase link --project-ref jpkpzwshylbbdnpncsgi
```

## Deploy

```bash
supabase functions deploy share
```

That's it — this reads everything from `supabase/functions/share/index.ts`
and `supabase/config.toml`.

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

Use your real project ref (`jpkpzwshylbbdnpncsgi`) and a real sentence +
completion id pair — the pair used while building this feature:
`dd9abdf0-c622-4b6f-ba97-0ceac48c5636` /
`66730c25-032d-4041-a142-5050905d7ac1`.

```bash
# 1. No Authorization header at all — this is exactly what a crawler sends.
#    Before the fix this returns 401 with UNAUTHORIZED_NO_AUTH_HEADER.
#    After the fix it must NOT be a 401.
curl -i \
  "https://jpkpzwshylbbdnpncsgi.supabase.co/functions/v1/share/sentence/dd9abdf0-c622-4b6f-ba97-0ceac48c5636/completion/66730c25-032d-4041-a142-5050905d7ac1" \
  | head -1

# 2. Same URL, with a crawler user-agent — should return real HTML
#    containing og:title, og:description, og:image, og:url and
#    twitter:card, not an error page. og:image and twitter:image must both
#    start with https:// — if either shows http://, the function running in
#    production is still the pre-fix build and needs redeploying.
curl -s -A "facebookexternalhit/1.1" \
  "https://jpkpzwshylbbdnpncsgi.supabase.co/functions/v1/share/sentence/dd9abdf0-c622-4b6f-ba97-0ceac48c5636/completion/66730c25-032d-4041-a142-5050905d7ac1" \
  | grep -E 'og:title|og:description|og:image|og:url|twitter:card'

# 3. Same URL, with an ordinary browser user-agent — should be a 302 to
#    matoy7.github.io, not a redirect to a login page or another error.
curl -I -A "Mozilla/5.0" \
  "https://jpkpzwshylbbdnpncsgi.supabase.co/functions/v1/share/sentence/dd9abdf0-c622-4b6f-ba97-0ceac48c5636/completion/66730c25-032d-4041-a142-5050905d7ac1"

# 4. The image URL printed by step 2 must itself be publicly fetchable over
#    https, with no auth error — this is what actually gets embedded in the
#    WhatsApp/Facebook preview, so if this fails the preview will too even
#    though the HTML above looks correct. If it fails, the response body is
#    now a plain-text error message describing exactly what went wrong
#    (which font/wasm fetch failed and its HTTP status, or satori/resvg's
#    own error) — no need to dig through `supabase functions logs` first.
curl -i -o preview.png \
  "https://jpkpzwshylbbdnpncsgi.supabase.co/functions/v1/share/og-image/dd9abdf0-c622-4b6f-ba97-0ceac48c5636/66730c25-032d-4041-a142-5050905d7ac1.png" \
  | head -1
file preview.png   # should say "PNG image data", not "ASCII text" (an error body)
```

Real end-to-end confirmation: paste a real share link into
[Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
or [Twitter Card Validator](https://cards-dev.twitter.com/validator) and
check the preview it renders. Facebook's debugger also has a "Scrape Again"
button, useful since it caches a link's preview the first time it's fetched
— if you tested this link before the https fix, force a re-scrape rather
than trusting a cached result.

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
