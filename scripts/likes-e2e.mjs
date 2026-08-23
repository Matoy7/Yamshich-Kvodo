/**
 * Headless verification of the like system against the built app.
 *
 * The Supabase REST endpoints are stubbed by an in-memory store that enforces
 * the same unique (completion_id, user_id) constraint the database does, so a
 * duplicate insert fails here exactly as it would in production.
 *
 *   node scripts/likes-e2e.mjs
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
await new Promise((r) => server.listen(4477, r))

const ME = "432f7aef-00eb-4853-b5f8-0e514f19874d"
const OTHER = "4d922adf-99f7-4e86-976a-a3b97ccde1ae"
const SENTENCE = "11111111-1111-1111-1111-111111111111"
const C1 = "ccccccc1-0000-0000-0000-000000000001"
const C2 = "ccccccc2-0000-0000-0000-000000000002"

const results = []
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail })
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
}

async function session(page, opts = {}) {
  const state = {
    // Seeded so C1 already has two likes from other people, none of them mine.
    likes: [
      { completion_id: C1, user_id: OTHER },
      { completion_id: C1, user_id: "9999aaaa-0000-0000-0000-000000000009" },
      ...(opts.seedMine ? [{ completion_id: C1, user_id: ME }] : []),
    ],
    writes: [],
    failNext: opts.failNext ?? 0,
    duplicateAttempts: 0,
  }

  await page.route("**/*supabase.co/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      })

    if (url.pathname.includes("/auth/v1/")) return json({})

    // The home feed is ranked in Postgres now; the browser calls this instead
    // of selecting from `sentences`.
    if (url.pathname.endsWith("/rpc/feed_ranked"))
      return json([
        {
          id: SENTENCE,
          text: "בא לי לאכול היום",
          author_id: OTHER,
          created_at: new Date(Date.now() - 3600e3).toISOString(),
          completion_count: 2,
          like_count: 0,
          participant_count: 1,
          is_trending: false,
          is_rising: false,
          is_new: false,
        },
      ])

    if (url.pathname.endsWith("/sentences"))
      return json([
        {
          id: SENTENCE,
          text: "בא לי לאכול היום",
          author_id: OTHER,
          created_at: new Date(Date.now() - 3600e3).toISOString(),
          completions_count: 2,
        },
      ])

    if (url.pathname.endsWith("/public_profiles"))
      return json([
        {
          id: OTHER,
          display_name: "שועל סקרן",
          first_name: null,
          avatar_url: null,
        },
        {
          id: ME,
          display_name: "דביבון מסתורי",
          first_name: null,
          avatar_url: null,
        },
      ])

    if (url.pathname.endsWith("/profiles")) return json([])

    if (url.pathname.endsWith("/completions")) {
      if (method !== "GET") return json([], 201)
      return json([
        {
          id: C1,
          text: "בדיוק כשחשבתי שהבנתי משהו.",
          created_at: new Date(Date.now() - 600e3).toISOString(),
          author_id: OTHER,
        },
        {
          id: C2,
          text: "פה מתחילה כל הבלגן.",
          created_at: new Date(Date.now() - 300e3).toISOString(),
          author_id: ME,
        },
      ])
    }

    if (url.pathname.endsWith("/completion_likes")) {
      if (method === "GET") return json(state.likes)

      if (method === "POST") {
        const body = JSON.parse(request.postData() || "{}")
        const row = Array.isArray(body) ? body[0] : body
        state.writes.push({ op: "insert", ...row })
        if (state.failNext > 0) {
          state.failNext -= 1
          await new Promise((r) => setTimeout(r, 250))
          return json({ message: "boom" }, 500)
        }
        // The real unique (completion_id, user_id) constraint.
        if (
          state.likes.some(
            (l) =>
              l.completion_id === row.completion_id &&
              l.user_id === row.user_id,
          )
        ) {
          state.duplicateAttempts += 1
          return json(
            {
              code: "23505",
              message: "duplicate key value violates unique constraint",
            },
            409,
          )
        }
        state.likes.push({
          completion_id: row.completion_id,
          user_id: row.user_id,
        })
        return json([row], 201)
      }

      if (method === "DELETE") {
        const cid = (url.searchParams.get("completion_id") || "").replace(
          "eq.",
          "",
        )
        const uid = (url.searchParams.get("user_id") || "").replace("eq.", "")
        state.writes.push({ op: "delete", completion_id: cid, user_id: uid })
        if (state.failNext > 0) {
          state.failNext -= 1
          await new Promise((r) => setTimeout(r, 250))
          return json({ message: "boom" }, 500)
        }
        state.likes = state.likes.filter(
          (l) => !(l.completion_id === cid && l.user_id === uid),
        )
        return json([], 204)
      }
    }
    return json([])
  })

  await page.addInitScript(
    ([uid]) => {
      const s = {
        access_token: "stub",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "stub",
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
      }
      localStorage.setItem(
        "sb-jpkpzwshylbbdnpncsgi-auth-token",
        JSON.stringify(s),
      )
    },
    [ME],
  )

  return state
}

/** The completions sheet specifically — the mobile nav drawer is also a modal dialog. */
const SHEET = '[role="dialog"][aria-modal="true"][aria-label^="השלמות עבור"]'

const like = (page) =>
  page
    .locator('[aria-label="אהבתי את ההשלמה"], [aria-label="הסר לייק"]')
    .first()
const readLike = async (page) => {
  const el = like(page)
  return {
    liked: (await el.getAttribute("aria-label")) === "הסר לייק",
    count: ((await el.textContent()) || "").trim(),
  }
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
})

// =========================================================================
// Desktop: hover popover
// =========================================================================
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const state = await session(page)
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.hover("article")
  await page.waitForSelector("[data-completions-preview]", { timeout: 5000 })
  await page.waitForTimeout(400)

  check(
    "7/8. count and own-state read from the server",
    (await readLike(page)).count === "2" && !(await readLike(page)).liked,
    JSON.stringify(await readLike(page)),
  )

  // -- optimistic like ----------------------------------------------------
  await like(page).click()
  const immediate = await readLike(page)
  check(
    "optimistic: fills and increments before the response",
    immediate.liked && immediate.count === "3",
    JSON.stringify(immediate),
  )

  check(
    "14. clicking like does NOT close the popup",
    await page.locator("[data-completions-preview]").isVisible(),
  )

  await page.waitForTimeout(400)
  check(
    "1. like is persisted",
    state.likes.some((l) => l.completion_id === C1 && l.user_id === ME),
  )

  // -- unlike -------------------------------------------------------------
  await like(page).click()
  await page.waitForTimeout(400)
  const after = await readLike(page)
  check(
    "2. unlike returns to the original state",
    !after.liked && after.count === "2",
    JSON.stringify(after),
  )
  check(
    "2b. unlike removed the row",
    !state.likes.some((l) => l.completion_id === C1 && l.user_id === ME),
  )

  // -- rapid clicking -----------------------------------------------------
  const before = state.writes.length
  for (let i = 0; i < 6; i += 1) await like(page).click({ delay: 0 })
  await page.waitForTimeout(900)
  const final = await readLike(page)
  const rows = state.likes.filter(
    (l) => l.completion_id === C1 && l.user_id === ME,
  ).length
  check(
    "13. rapid like/unlike creates no duplicate rows",
    rows <= 1,
    `${rows} row(s)`,
  )
  check(
    "3. no duplicate ever reached the constraint",
    state.duplicateAttempts === 0,
  )
  check(
    "13b. final UI matches final server state",
    final.liked === (rows === 1),
    `ui=${final.liked} server=${rows === 1}, ${state.writes.length - before} write(s) for 6 clicks`,
  )

  // -- genuine same-tick burst -------------------------------------------
  // The sequential clicks above never overlap a response, so nothing collapses.
  // Fire them all inside one JS tick, faster than any request can return.
  const burstBefore = state.writes.length
  await page.evaluate(() => {
    const button = document.querySelector(
      '[aria-label="אהבתי את ההשלמה"], [aria-label="הסר לייק"]',
    )
    for (let i = 0; i < 8; i += 1) button.click()
  })
  await page.waitForTimeout(1200)
  const burstUi = await readLike(page)
  const burstRows = state.likes.filter(
    (l) => l.completion_id === C1 && l.user_id === ME,
  ).length
  check(
    "13c. same-tick burst: no duplicate rows",
    burstRows <= 1,
    `${burstRows} row(s)`,
  )
  check(
    "13d. same-tick burst: UI matches server",
    burstUi.liked === (burstRows === 1),
    `ui=${burstUi.liked} server=${burstRows === 1}`,
  )
  check(
    "13e. same-tick burst collapses requests",
    state.writes.length - burstBefore < 8,
    `${state.writes.length - burstBefore} write(s) for 8 clicks`,
  )
  check(
    "13f. no duplicate reached the constraint",
    state.duplicateAttempts === 0,
  )

  await page.close()
}

// =========================================================================
// Failure rollback
// =========================================================================
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const state = await session(page, { failNext: 1 })
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.hover("article")
  await page.waitForSelector("[data-completions-preview]")
  await page.waitForTimeout(300)

  await like(page).click()
  const optimistic = await readLike(page)
  await page.waitForTimeout(600)
  const rolled = await readLike(page)

  check(
    "8a. failed write rolls the UI back",
    optimistic.liked && !rolled.liked && rolled.count === "2",
    `optimistic=${JSON.stringify(optimistic)} after=${JSON.stringify(rolled)}`,
  )
  check(
    "8b. subtle inline error, no modal",
    (await page.locator("text=לא נשמר").count()) === 1 &&
      (await page.locator(SHEET).count()) === 0,
  )
  check(
    "8c. popup survives the failure",
    await page.locator("[data-completions-preview]").isVisible(),
  )
  check("8d. nothing persisted", !state.likes.some((l) => l.user_id === ME))
  await page.close()
}

// =========================================================================
// Reload preserves the like (9/10/11 share this mechanism: the row is keyed
// on the auth uid, which none of those flows change)
// =========================================================================
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await session(page, { seedMine: true })
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.hover("article")
  await page.waitForSelector("[data-completions-preview]")
  await page.waitForTimeout(400)
  const s = await readLike(page)
  check(
    "9/10/11. a like already on the server renders as active",
    s.liked && s.count === "3",
    JSON.stringify(s),
  )
  await page.close()
}

// =========================================================================
// Mobile bottom sheet
// =========================================================================
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 780 },
    hasTouch: true,
    isMobile: true,
  })
  const state = await session(page)
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.locator("article").first().click()
  await page.waitForSelector(SHEET, { timeout: 5000 })
  await page.waitForTimeout(400)

  const box = await like(page).boundingBox()
  check(
    "11. touch target is at least 44px tall",
    box && box.height >= 44,
    `${Math.round(box?.height ?? 0)}px`,
  )

  await like(page).click()
  await page.waitForTimeout(400)
  const m = await readLike(page)
  check("15. sheet like works", m.liked && m.count === "3", JSON.stringify(m))
  check(
    "15b. sheet stays open after liking",
    await page.locator(SHEET).isVisible(),
  )
  check(
    "15c. persisted from the sheet",
    state.likes.some((l) => l.user_id === ME),
  )
  await page.close()
}

// =========================================================================
// Accessibility + no-like-data degradation
// =========================================================================
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await session(page)
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.hover("article")
  await page.waitForSelector("[data-completions-preview]")
  await page.waitForTimeout(300)

  const el = like(page)
  check(
    "14a. aria-pressed reflects state",
    (await el.getAttribute("aria-pressed")) === "false",
  )
  await el.focus()
  check(
    "14b. keyboard focusable",
    await el.evaluate((n) => n === document.activeElement),
  )
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const k = await readLike(page)
  check("14c. operable by keyboard", k.liked, JSON.stringify(k))
  check(
    "14d. label switches to the un-like wording",
    (await el.getAttribute("aria-label")) === "הסר לייק",
  )

  // Zero-count rendering, on the completion nobody has liked.
  const second = page
    .locator('[aria-label="אהבתי את ההשלמה"], [aria-label="הסר לייק"]')
    .nth(1)
  check(
    "16. a zero count renders no number",
    ((await second.textContent()) || "").trim() === "",
  )
  await page.close()
}

// =========================================================================
// Missing table degrades gracefully instead of breaking the panel
// =========================================================================
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await session(page)
  await page.route("**/completion_likes*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        code: "42P01",
        message: 'relation "public.completion_likes" does not exist',
      }),
    }),
  )
  await page.goto("http://localhost:4477/", { waitUntil: "networkidle" })
  await page.hover("article")
  await page.waitForSelector("[data-completions-preview]")
  await page.waitForTimeout(400)

  const body = await page.locator("[data-completions-preview]").textContent()
  check(
    "16. missing table hides the control but keeps completions visible",
    body.includes("בדיוק כשחשבתי שהבנתי משהו") &&
      (await like(page).count()) === 0,
  )
  await page.close()
}

await browser.close()
server.close()

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
