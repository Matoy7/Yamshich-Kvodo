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
- `.figma/make/site.json`: set `title` to "המשלים שלי" and `language` to `he` (previously an untitled/English-default placeholder), which only affects the browser tab title and `<html lang>` — no visible UI change.
- Added `public/.nojekyll` so GitHub Pages serves the build as-is without Jekyll processing.
- Added `.github/workflows/deploy.yml` for automatic build + deploy on push to `main`.
- Replaced `pnpm-lock.yaml` with a generated `package-lock.json` so `npm install` / `npm ci` work as specified (the project itself still uses only `npm`-standard tooling).

Note: `.figma/make/site.json` still has `robots.index: false`, which was already set in the supplied project and makes the build emit a `noindex` meta tag and a disallow-all `robots.txt`. This was left untouched as part of "minimum necessary change," but means the deployed site won't be indexed by search engines until you change that value to `true` (or remove the `robots` block) if you want it discoverable.

## Project structure

```
├── src/
│   ├── App.tsx        # Main app component (Figma Make output, unmodified UI)
│   ├── main.tsx        # React entry point
│   └── index.css       # Tailwind v4 entry + font import
├── public/
│   └── assets/          # Images/icons used by the app
├── index.html
├── vite.config.ts
├── package.json
└── .github/workflows/deploy.yml
```
