/**
 * Geometry checks for the completion row layout.
 *
 * Assertions are made against measured pixel positions rather than class
 * names, so the tests fail if the rows drift apart visually no matter how the
 * styling is expressed.
 *
 *   node scripts/completion-layout-e2e.mjs
 */
import { chromium } from "playwright"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x")
  let file = path.join("dist", decodeURIComponent(url.pathname))
  if (url.pathname === "/" || !fs.existsSync(file))
    file = path.join("dist", "index.html")
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
  })
  res.end(fs.readFileSync(file))
})
await new Promise((r) => server.listen(4488, r))

const ME = "432f7aef-00eb-4853-b5f8-0e514f19874d"
const AUTHORS = {
  a: "4d922adf-0000-0000-0000-00000000000a",
  b: "4d922adf-0000-0000-0000-00000000000b",
  c: "4d922adf-0000-0000-0000-00000000000c",
}

// The nine cases from the brief, in one popup.
const CASES = [
  ["c1", "שלום", AUTHORS.a, 3], // short Hebrew, multiple likes
  [
    "c2",
    "ינשוף זריז מג׳נטה עם בלון שדגשדגשדג ועוד קצת טקסט בעברית",
    AUTHORS.b,
    0,
  ], // long Hebrew, zero likes
  ["c3", "bbb", AUTHORS.c, 1], // short English  ← the reported bug
  [
    "c4",
    "this is a considerably longer english completion that has to wrap",
    AUTHORS.a,
    0,
  ],
  ["c5", "קצת עברית and some English mixed together", AUTHORS.b, 2], // mixed
  ["c6", "ד".repeat(220), AUTHORS.c, 0], // wraps to several lines
  ["c7", "ddddd", AUTHORS.a, 0], // short English again
]
const NAMES = {
  [AUTHORS.a]: "Yotam",
  [AUTHORS.b]: "Yinon",
  [AUTHORS.c]: "משתמש עם שם מאוד מאוד ארוך שאמור להיחתך", // long username
}

const results = []
const check = (name, pass, detail = "") => {
  results.push({ name, pass })
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
})
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
})

await page.route("**/*supabase.co/**", (route) => {
  const url = new URL(route.request().url())
  const json = (body) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    })

  if (url.pathname.includes("/auth/v1/")) return json({})
  if (url.pathname.endsWith("/rpc/feed_ranked"))
    return json([
      {
        id: "s1",
        text: "aaa",
        author_id: AUTHORS.a,
        created_at: new Date(Date.now() - 864e5).toISOString(),
        completion_count: CASES.length,
        like_count: 0,
        participant_count: 3,
        is_trending: false,
        is_rising: false,
        is_new: false,
      },
    ])
  if (url.pathname.endsWith("/sentences"))
    return json([
      {
        id: "s1",
        text: "aaa",
        author_id: AUTHORS.a,
        created_at: new Date(Date.now() - 864e5).toISOString(),
        completions_count: CASES.length,
      },
    ])
  if (url.pathname.endsWith("/public_profiles"))
    return json(
      Object.entries(NAMES).map(([id, display_name]) => ({
        id,
        display_name,
        first_name: null,
        avatar_url: null,
      })),
    )
  if (url.pathname.endsWith("/completions"))
    return json(
      CASES.map(([id, text, author], i) => ({
        id,
        text,
        author_id: author,
        created_at: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
      })),
    )
  if (url.pathname.endsWith("/completion_likes"))
    return json(
      CASES.flatMap(([id, , , likes]) =>
        Array.from({ length: likes }, (_, n) => ({
          completion_id: id,
          user_id: `u${n}`,
        })),
      ),
    )
  return json([])
})

await page.addInitScript(
  ([uid]) => {
    localStorage.setItem(
      "sb-jpkpzwshylbbdnpncsgi-auth-token",
      JSON.stringify({
        access_token: "s",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "s",
        user: {
          id: uid,
          aud: "authenticated",
          role: "authenticated",
          is_anonymous: true,
          app_metadata: { provider: "anonymous", providers: ["anonymous"] },
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
        },
      }),
    )
  },
  [ME],
)

await page.goto("http://localhost:4488/", { waitUntil: "networkidle" })
await page.hover("article")
await page.waitForSelector("[data-completions-preview]")
await page.waitForTimeout(700)

const metrics = await page.evaluate(() => {
  const popup = document.querySelector("[data-completions-preview]")
  const rows = [...popup.querySelectorAll("li")]

  /** Bounding box of the glyphs themselves, not the block that contains them. */
  const inkBox = (el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rects = [...range.getClientRects()].filter((r) => r.width > 0)
    if (!rects.length) return null
    return {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
      lines: rects.length,
    }
  }

  return {
    popup: popup.getBoundingClientRect().toJSON(),
    popupOverflow: popup.scrollWidth > popup.clientWidth + 1,
    rows: rows.map((li) => {
      const avatar = li.querySelector("img")
      const meta = li.querySelector("div > div")
      const text = li.querySelector("p")
      const heart = li.querySelector("button")
      const metaStyle = getComputedStyle(meta)
      return {
        avatar: avatar.getBoundingClientRect().toJSON(),
        metaBox: meta.getBoundingClientRect().toJSON(),
        metaLineHeight: parseFloat(metaStyle.lineHeight),
        textBox: text.getBoundingClientRect().toJSON(),
        textInk: inkBox(text),
        textAlign: getComputedStyle(text).textAlign,
        textDirection: getComputedStyle(text).direction,
        heart: heart ? heart.getBoundingClientRect().toJSON() : null,
        heartIcon: heart
          ? heart.querySelector("span").getBoundingClientRect().toJSON()
          : null,
        liBox: li.getBoundingClientRect().toJSON(),
      }
    }),
  }
})

const round = (n) => Math.round(n * 10) / 10
const uniq = (values) => [...new Set(values.map(round))]
const spread = (values) => round(Math.max(...values) - Math.min(...values))

// -- one grid -----------------------------------------------------------------
const avatarRights = metrics.rows.map((r) => r.avatar.right)
check(
  "avatars share one axis",
  spread(avatarRights) < 0.5,
  `spread ${spread(avatarRights)}px`,
)
check(
  "avatars are 32px",
  metrics.rows.every(
    (r) =>
      Math.round(r.avatar.width) === 32 && Math.round(r.avatar.height) === 32,
  ),
  `${Math.round(metrics.rows[0].avatar.width)}px`,
)

const textRights = metrics.rows.map((r) => r.textBox.right)
const textLefts = metrics.rows.map((r) => r.textBox.left)
check(
  "text blocks share one right axis",
  spread(textRights) < 0.5,
  `spread ${spread(textRights)}px`,
)
check(
  "text blocks share one width",
  spread(textLefts) < 0.5,
  `spread ${spread(textLefts)}px`,
)

const metaRights = metrics.rows.map((r) => r.metaBox.right)
check(
  "metadata shares the text axis",
  spread([...metaRights, ...textRights]) < 0.5,
  `spread ${spread([...metaRights, ...textRights])}px`,
)

// -- the reported bug ---------------------------------------------------------
// Right-aligned means the glyphs end at the right edge of their own block.
const misaligned = metrics.rows
  .map((r, i) => ({
    i,
    text: CASES[i][1].slice(0, 18),
    gap: round(r.textBox.right - r.textInk.right),
  }))
  .filter((r) => r.gap > 1)
check(
  "every completion is flush right, whatever its language",
  misaligned.length === 0,
  misaligned.length ? JSON.stringify(misaligned) : "all 7 cases",
)

check(
  "no paragraph resolved to LTR",
  metrics.rows.every((r) => r.textDirection === "rtl"),
  uniq(metrics.rows.map((r) => (r.textDirection === "rtl" ? 1 : 0))).join(),
)

// The two cases called out by name in the brief.
const bbb = metrics.rows[2],
  ddddd = metrics.rows[6]
check(
  '"bbb" is not on the left',
  round(bbb.textBox.right - bbb.textInk.right) < 1 &&
    bbb.textInk.left > metrics.popup.left + metrics.popup.width / 2,
  `ink right ${round(bbb.textInk.right)} vs block right ${round(bbb.textBox.right)}`,
)
check(
  '"ddddd" is not on the left',
  round(ddddd.textBox.right - ddddd.textInk.right) < 1 &&
    ddddd.textInk.left > metrics.popup.left + metrics.popup.width / 2,
)

// -- hearts -------------------------------------------------------------------
const withHeart = metrics.rows.filter((r) => r.heartIcon)
const heartRights = withHeart.map((r) => r.heartIcon.right)
check(
  "hearts share one axis",
  spread(heartRights) < 0.5,
  `${withHeart.length} rows, spread ${spread(heartRights)}px`,
)
check(
  "hearts align to the text axis",
  spread([...heartRights.map((v) => v), ...textRights]) < 1.5,
  `spread ${spread([...heartRights, ...textRights])}px`,
)

// -- metadata is one line ------------------------------------------------------
check(
  "metadata stays on one line, long username included",
  metrics.rows.every((r) => r.metaBox.height <= r.metaLineHeight + 1),
  `tallest ${round(Math.max(...metrics.rows.map((r) => r.metaBox.height)))}px`,
)

// -- rhythm --------------------------------------------------------------------
const metaToText = metrics.rows.map((r) =>
  round(r.textBox.top - r.metaBox.bottom),
)
const textToHeart = withHeart.map((r) =>
  round(r.heart.top + 8 - r.textBox.bottom),
) // 8px = the button's negative inset
const rowGaps = metrics.rows
  .slice(1)
  .map((r, i) => round(r.liBox.top - metrics.rows[i].liBox.bottom))
check(
  "8–12px between metadata and text",
  metaToText.every((v) => v >= 8 && v <= 12),
  uniq(metaToText).join("/") + "px",
)
check(
  "8–12px between text and action",
  textToHeart.every((v) => v >= 8 && v <= 12),
  uniq(textToHeart).join("/") + "px",
)
check(
  "16–20px between rows",
  rowGaps.every((v) => v >= 16 && v <= 20),
  uniq(rowGaps).join("/") + "px",
)

// -- wrapping / overflow --------------------------------------------------------
check(
  "long completion wraps rather than overflowing",
  metrics.rows[5].textInk.lines >= 3,
  `${metrics.rows[5].textInk.lines} lines`,
)
check("popup does not scroll horizontally", !metrics.popupOverflow)
check(
  "popup width unchanged (380px)",
  Math.round(metrics.popup.width) === 380,
  `${Math.round(metrics.popup.width)}px`,
)

// -- the dead CTA is gone --------------------------------------------------------
const cta = await page
  .locator("[data-completions-preview] button:disabled")
  .count()
check("no permanently disabled action in the popup", cta === 0, `${cta} found`)

await page
  .locator("[data-completions-preview]")
  .screenshot({ path: "/tmp/completions-desktop.png" })
await page.close()

// -- mobile sheet ----------------------------------------------------------------
{
  const m = await browser.newPage({
    viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  })
  await m.route("**/*supabase.co/**", (route) => {
    const url = new URL(route.request().url())
    const json = (b) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(b),
      })
    if (url.pathname.includes("/auth/v1/")) return json({})
    if (url.pathname.endsWith("/rpc/feed_ranked"))
      return json([
        {
          id: "s1",
          text: "aaa",
          author_id: AUTHORS.a,
          created_at: new Date(Date.now() - 864e5).toISOString(),
          completion_count: CASES.length,
          like_count: 0,
          participant_count: 3,
          is_trending: false,
          is_rising: false,
          is_new: false,
        },
      ])
    if (url.pathname.endsWith("/sentences"))
      return json([
        {
          id: "s1",
          text: "aaa",
          author_id: AUTHORS.a,
          created_at: new Date(Date.now() - 864e5).toISOString(),
          completions_count: CASES.length,
        },
      ])
    if (url.pathname.endsWith("/public_profiles"))
      return json(
        Object.entries(NAMES).map(([id, display_name]) => ({
          id,
          display_name,
          first_name: null,
          avatar_url: null,
        })),
      )
    if (url.pathname.endsWith("/completions"))
      return json(
        CASES.map(([id, text, author], i) => ({
          id,
          text,
          author_id: author,
          created_at: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
        })),
      )
    if (url.pathname.endsWith("/completion_likes"))
      return json(
        CASES.flatMap(([id, , , likes]) =>
          Array.from({ length: likes }, (_, n) => ({
            completion_id: id,
            user_id: `u${n}`,
          })),
        ),
      )
    return json([])
  })
  await m.addInitScript(
    ([uid]) => {
      localStorage.setItem(
        "sb-jpkpzwshylbbdnpncsgi-auth-token",
        JSON.stringify({
          access_token: "s",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "s",
          user: {
            id: uid,
            aud: "authenticated",
            role: "authenticated",
            is_anonymous: true,
            app_metadata: { provider: "anonymous", providers: ["anonymous"] },
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
          },
        }),
      )
    },
    [ME],
  )
  await m.goto("http://localhost:4488/", { waitUntil: "networkidle" })
  await m.locator("article").first().click()
  await m.waitForSelector('[aria-label^="השלמות עבור"]')
  await m.waitForTimeout(700)

  const mob = await m.evaluate(() => {
    const sheet = document.querySelector('[aria-label^="השלמות עבור"]')
    const rows = [...sheet.querySelectorAll("li")]
    const ink = (el) => {
      const r = document.createRange()
      r.selectNodeContents(el)
      const rects = [...r.getClientRects()].filter((x) => x.width > 0)
      return rects.length ? Math.max(...rects.map((x) => x.right)) : null
    }
    return {
      overflow: sheet.scrollWidth > sheet.clientWidth + 1,
      gaps: rows.map((li) => {
        const p = li.querySelector("p")
        return Math.round((p.getBoundingClientRect().right - ink(p)) * 10) / 10
      }),
    }
  })
  check(
    "mobile: every completion flush right",
    mob.gaps.every((g) => g < 1),
    JSON.stringify(mob.gaps),
  )
  check("mobile: no horizontal overflow", !mob.overflow)
  await m.screenshot({ path: "/tmp/completions-mobile.png" })
  await m.close()
}

await browser.close()
server.close()

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
