/**
 * Renders the social share card used by WhatsApp, iMessage, Slack, X and
 * Facebook when someone pastes a link to the site.
 *
 *   node scripts/og-image.mjs
 *
 * Writes public/og-image.png (1200×630). Requires `playwright` and the
 * @fontsource packages, which are dev-only and installed on demand:
 *
 *   npm i --no-save playwright @fontsource/rubik @fontsource/alef
 *   npx playwright install chromium   # unless a browser is already present
 *
 * The output is committed to the repository, so a normal build never needs
 * any of this. Re-run it only when the card's wording or artwork changes.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const WIDTH = 1200
const HEIGHT = 630

/** WhatsApp is the strictest consumer of this file; it drops oversized ones. */
const MAX_BYTES = 300 * 1024

const font = (relative) => {
  for (const base of [path.join(ROOT, 'node_modules'), '/tmp/ogfonts/node_modules']) {
    const file = path.join(base, relative)
    if (fs.existsSync(file)) return fs.readFileSync(file).toString('base64')
  }
  throw new Error(`missing font ${relative} — run: npm i --no-save @fontsource/rubik @fontsource/alef`)
}

const FONTS = {
  alef: font('@fontsource/alef/files/alef-hebrew-700-normal.woff2'),
  rubik300: font('@fontsource/rubik/files/rubik-hebrew-300-normal.woff2'),
  rubik400: font('@fontsource/rubik/files/rubik-hebrew-400-normal.woff2'),
  rubik500: font('@fontsource/rubik/files/rubik-hebrew-500-normal.woff2'),
}

const portrait = fs.readFileSync(path.join(ROOT, 'public/assets/b4624.png')).toString('base64')

// Design tokens, mirrored from src/index.css so the card cannot drift from
// the product's palette.
const html = `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
  @font-face { font-family: Alef;  src: url(data:font/woff2;base64,${FONTS.alef}) format('woff2'); font-weight: 700; }
  @font-face { font-family: Rubik; src: url(data:font/woff2;base64,${FONTS.rubik300}) format('woff2'); font-weight: 300; }
  @font-face { font-family: Rubik; src: url(data:font/woff2;base64,${FONTS.rubik400}) format('woff2'); font-weight: 400; }
  @font-face { font-family: Rubik; src: url(data:font/woff2;base64,${FONTS.rubik500}) format('woff2'); font-weight: 500; }

  :root {
    --primary:   #0f3040;
    --cream:     #f8e3ca;
    --ink:       #1f2430;
    --surface:   #ffffff;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    font-family: Rubik, system-ui, sans-serif;
    background: radial-gradient(120% 140% at 88% 12%, #17475d 0%, var(--primary) 55%, #09222e 100%);
    color: var(--surface);
    display: flex; align-items: center; justify-content: center; gap: 56px;
    padding: 0 72px;
  }

  /* Portrait ------------------------------------------------------------ */
  .portrait {
    flex: 0 0 auto; position: relative;
    width: 372px; height: 372px;
  }
  .portrait img {
    width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
    border: 8px solid var(--cream);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
  }
  /* Soft halo, so the circle never looks pasted onto the gradient. */
  .portrait::before {
    content: ''; position: absolute; inset: -26px;
    border-radius: 50%; background: rgba(248, 227, 202, 0.10);
  }

  /* Copy ---------------------------------------------------------------- */
  /* Shrink-to-content, so the pair sits as one centred composition instead of
     hugging the start edge with dead gradient opposite it. */
  .copy { flex: 0 1 auto; min-width: 0; }
  .brand {
    font-family: Alef, Rubik, sans-serif; font-weight: 700;
    font-size: 96px; line-height: 1.02; letter-spacing: -1px;
  }
  .tagline {
    margin-top: 12px;
    font-size: 33px; font-weight: 300; color: var(--cream);
    letter-spacing: 0.2px;
  }
  .rule {
    margin: 26px 0 24px; width: 88px; height: 5px; border-radius: 999px;
    background: var(--cream); opacity: 0.85;
  }

  /* The concept, shown rather than described: one person opens a sentence,
     another finishes it. Both bubbles shrink to their text — a stretched
     bubble would read as a text field, not as speech. */
  .thread { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
  .bubble {
    width: fit-content; max-width: 100%;
    padding: 16px 26px; font-size: 29px; line-height: 1.3; font-weight: 400;
    white-space: nowrap;
  }
  .bubble.open {
    background: var(--surface); color: var(--ink);
    border-radius: 20px 20px 4px 20px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
  }
  /* Stepped away from the start edge so the pair reads as a reply rather
     than as two stacked labels. */
  .bubble.close {
    margin-inline-start: 72px;
    background: var(--cream); color: #2a1c0c; font-weight: 500;
    border-radius: 20px 20px 20px 4px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
  }
</style></head>
<body>
  <div class="portrait"><img src="data:image/png;base64,${portrait}" alt=""></div>

  <div class="copy">
    <div class="brand">ימשיך כבודו</div>
    <div class="tagline">שני אנשים. משפט אחד.</div>
    <div class="rule"></div>
    <div class="thread">
      <div class="bubble open">בא לי לאכול היום…</div>
      <div class="bubble close">…מה שאמא מבשלת</div>
    </div>
  </div>
</body></html>`

// Use a preinstalled Chromium when the pinned download is absent, so the
// script works on a machine that already has one.
const preinstalled = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
const browser = await chromium.launch(
  fs.existsSync(preinstalled) ? { executablePath: preinstalled } : {},
)
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

// JPEG, not PNG: the portrait is a painting, and a lossless encode of it runs
// past WhatsApp's size ceiling. At this quality the flat panels and type stay
// clean while the file lands comfortably under the limit.
const target = path.join(ROOT, 'public/og-image.jpg')
await page.screenshot({ path: target, type: 'jpeg', quality: 92 })
await browser.close()

const bytes = fs.statSync(target).size
console.log(`[og-image] ${path.relative(ROOT, target)} — ${WIDTH}×${HEIGHT}, ${Math.round(bytes / 1024)} KB`)
if (bytes > MAX_BYTES) {
  console.error(`[og-image] too large: ${Math.round(bytes / 1024)} KB > ${MAX_BYTES / 1024} KB. WhatsApp may drop it.`)
  process.exit(1)
}
