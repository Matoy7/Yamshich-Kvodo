# המשלים שלי

A Hebrew RTL sentence-completion social web app. This is the Home Page implementation, generated with Figma Make and prepared here for deployment as a static site on GitHub Pages.

The stack is React 19 + Vite + Tailwind CSS v4 — the exact stack produced by Figma Make. The UI, layout, styling, and assets are unchanged from the Figma Make output; only the minimum configuration needed for GitHub Pages hosting was added (see "What was changed for deployment" below).

## Requirements

- Node.js 20+ (the deploy workflow uses Node 20)
- npm

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

This starts the Vite dev server (defaults to `http://localhost:8443`).

## Build

```bash
npm run build
```

Outputs the static site to `dist/`. You can preview the production build locally with:

```bash
npm run preview
```

## Deployment (GitHub Pages)

This repo includes `.github/workflows/deploy.yml`, which automatically builds and deploys the site to GitHub Pages on every push to the `main` branch, using GitHub's official Pages Actions (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) — no extra secrets or third-party actions required.

**One-time setup after pushing this repo to GitHub:**

1. Go to your repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push (or re-run the workflow) — the site will build and deploy automatically.
4. Your site will be available at `https://<username>.github.io/<repository-name>/`.

No further configuration is needed: the Vite `base` is set to a relative path (`./`), and all asset URLs are resolved relative to it, so the build works correctly under any GitHub Pages sub-path without hard-coding the repository name.

## What was changed for deployment

Only the minimum required to make the existing Figma Make output deployable as a static site on GitHub Pages — no UI, layout, styling, or content changes:

- `vite.config.ts`: build `base` defaults to `./` (relative) instead of `/`, so asset/script URLs resolve correctly when the site is served from a GitHub Pages repository sub-path.
- `src/App.tsx`: the local `assetPathPrefix` now uses `import.meta.env.BASE_URL` instead of a hard-coded absolute `/assets` path, for the same reason (this only affects how the URL is built — the images, icons, and everything else are unchanged).
- `index.html`: added `dir="rtl"` on `<html>` (in addition to the existing `lang` templating) for correct document-level RTL semantics. This doesn't change any rendering — the app's root element already sets its own explicit `dir` for layout.
- `.figma/make/site.json`: set `title` to "ימשיך כבודו" and `language` to `he` (previously an untitled/English-default placeholder), which only affects the browser tab title and `<html lang>` — no visible UI change.
- Added `public/.nojekyll` so GitHub Pages serves the build as-is without Jekyll processing.
- Added `.github/workflows/deploy.yml` for automatic build + deploy on push to `main`.
- Replaced `pnpm-lock.yaml` with a generated `package-lock.json` so `npm install` / `npm ci` work as specified (the project itself still uses only `npm`-standard tooling).

Note: `.figma/make/site.json` still has `robots.index: false`, which was already set in the supplied project and makes the build emit a `noindex` meta tag and a disallow-all `robots.txt`. This was left untouched as part of "minimum necessary change," but means the deployed site won't be indexed by search engines until you change that value to `true` (or remove the `robots` block) if you want it discoverable.

## Project structure

```
├── src/
│   ├── index.css                 # Design tokens (@theme) + base layer
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Home page composition
│   ├── lib/
│   │   ├── cn.ts                 # Class-name composer
│   │   └── assets.ts             # Static asset registry (BASE_URL aware)
│   ├── data/                     # Navigation + sentence feed data
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, Avatar, Input,
│   │   │                         # IconButton, Icon, EmptyState
│   │   └── layout/               # DashboardLayout, Sidebar, MobileNav,
│   │                             # Topbar, Section
│   └── features/home/            # HeroBanner, SentenceCard, SentenceGrid
├── public/assets/                # Original Figma Make image/icon exports
├── scripts/verify-assets.mjs     # Build guard: fails on Git LFS pointers
├── index.html
├── vite.config.ts
├── package.json
└── .github/workflows/deploy.yml
```

## Backend (Supabase)

Auth and data live in Supabase. The app is still a static site — Supabase runs
the OAuth exchange and the database, so nothing server-side is deployed here.

### 1. Database

Supabase dashboard → SQL Editor → paste `supabase/schema.sql` → Run. It is
idempotent, so re-running is safe. It creates `profiles`, `sentences` and
`completions`, a trigger that creates a profile on signup, and Row Level
Security policies (everything readable by signed-in users; rows writable only
by their owner).

### 2. Google sign-in

1. Google Cloud Console → APIs & Services → OAuth consent screen (External).
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase → Authentication → Providers → Google → enable, paste the client ID
   and secret.

### 3. URLs

Supabase → Authentication → URL Configuration:

- Site URL: `https://matoy7.github.io/Yamshich-Kvodo/`
- Redirect allow-list: `https://matoy7.github.io/Yamshich-Kvodo/**` and
  `http://localhost:8443/**`

### 4. Keys

Copy `.env.example` to `.env` for local development and fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` — the publishable/anon key

Both are on the dashboard's **Connect** button (top bar), or under
**Settings → API Keys**. Newer projects issue an `sb_publishable_…` key; it
goes in the same variable.

These are the only two variables the frontend uses. **The service-role /
secret key must never appear in this repository** — it bypasses Row Level
Security entirely.

For deploys, add the same two names in GitHub → Settings → Secrets and
variables → Actions → **Variables** (not Secrets — both values are public by
design). The workflow passes them into the build.

For deploys, add the same two names in GitHub → Settings → Secrets and variables
→ Actions → **Variables** (not Secrets — both values are public by design;
access is controlled by Row Level Security, not by hiding them). The workflow
passes them into the build.

Without these variables the app builds fine and renders a setup notice instead
of the dashboard.

## Design system

All design decisions live as tokens in `src/index.css` under Tailwind v4's
`@theme` block — spacing (4px base), semantic colours, typography scale,
radius scale, elevation and control heights. Components consume them as
utilities (`bg-surface`, `text-content-muted`, `rounded-lg`, `shadow-card`).

Do not hardcode colours, radii, shadows or control heights in components;
add or adjust a token instead.

## Link previews (WhatsApp, iMessage, Slack, X)

Pasting the site URL into a chat shows a card: the image
`public/og-image.jpg` (1200×630) plus the title and description from
`.figma/make/site.json`.

The Open Graph tags live in the head of `index.html`. **Their URLs are
absolute on purpose.** Everything else in this build uses relative paths so the
site works from a GitHub Pages sub-path, but a crawler fetches `og:image`
with no document base, so a relative path there produces no thumbnail at all.
If the site ever moves, update the origin in `index.html`.

`npm run build` runs `scripts/verify-social-card.mjs`, which fails the build if
the tags go missing, a URL stops being absolute, the image is absent or grows
past WhatsApp's ~300 KB ceiling, or `noindex` / a blocking `robots.txt` comes
back.

To change the card's artwork or wording, edit and re-run the generator:

```
npm i --no-save playwright @fontsource/rubik @fontsource/alef
node scripts/og-image.mjs
```

It writes `public/og-image.jpg`, which is committed to the repository — a
normal build never needs Playwright.

### If the preview does not update

WhatsApp caches a URL's preview for roughly a week, per URL, and re-checks
nothing in between. After deploying a change, test with a URL it has not seen:
append `?v=2` (`https://matoy7.github.io/Yamshich-Kvodo/?v=2`). Facebook's
[Sharing Debugger](https://developers.facebook.com/tools/debug/) shows exactly
what the crawlers read and can force a re-scrape.
