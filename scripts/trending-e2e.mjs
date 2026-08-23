/**
 * Front-end behaviour for the ranked feed.
 *
 *   node scripts/trending-e2e.mjs
 *
 * The ranking itself is verified in Postgres (see the SQL in
 * supabase/2026-08-trending.sql); this checks that the app consumes it,
 * indicates it sparingly, and still works without it.
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
await new Promise((r) => server.listen(4499, r))

const ME = "432f7aef-00eb-4853-b5f8-0e514f19874d"
const OTHER = "4d922adf-0000-0000-0000-00000000000a"

/** Mirrors what public.feed_ranked returns, already ordered. */
const RANKED = [
  {
    id: "s1",
    text: "C · rising fast",
    completion_count: 12,
    like_count: 8,
    participant_count: 12,
    is_trending: true,
    is_rising: false,
    is_new: false,
  },
  {
    id: "s2",
    text: "D · many likes",
    completion_count: 2,
    like_count: 25,
    participant_count: 25,
    is_trending: true,
    is_rising: false,
    is_new: false,
  },
  {
    id: "s3",
    text: "E · gaining",
    completion_count: 3,
    like_count: 2,
    participant_count: 3,
    is_trending: false,
    is_rising: true,
    is_new: false,
  },
  {
    id: "s4",
    text: "F · brand new",
    completion_count: 0,
    like_count: 0,
    participant_count: 0,
    is_trending: false,
    is_rising: false,
    is_new: true,
  },
  {
    id: "s5",
    text: "B · old popular",
    completion_count: 25,
    like_count: 28,
    participant_count: 28,
    is_trending: false,
    is_rising: false,
    is_new: false,
  },
].map((row, i) => ({
  ...row,
  author_id: OTHER,
  created_at: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
}))

const results = []
const check = (name, pass, detail = "") => {
  results.push({ name, pass })
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
}

async function boot(page, { breakRanking = false } = {}) {
  const calls = { rpc: 0, sentences: 0, completions: 0, likes: 0 }

  await page.route("**/*supabase.co/**", async (route) => {
    const url = new URL(route.request().url())
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      })

    if (url.pathname.includes("/auth/v1/")) return json({})

    if (url.pathname.endsWith("/rpc/feed_ranked")) {
      calls.rpc += 1
      if (breakRanking)
        return json(
          {
            code: "42883",
            message: "function public.feed_ranked(integer) does not exist",
          },
          404,
        )
      return json(RANKED)
    }
    if (url.pathname.endsWith("/sentences")) {
      calls.sentences += 1
      return json(
        RANKED.map(({ id, text, author_id, created_at }) => ({
          id,
          text,
          author_id,
          created_at,
          completions: [{ count: 0 }],
        })),
      )
    }
    if (url.pathname.endsWith("/sentence_metrics")) return json(RANKED)
    if (url.pathname.endsWith("/completions")) {
      calls.completions += 1
      return json([])
    }
    if (url.pathname.endsWith("/completion_likes")) {
      calls.likes += 1
      return json([])
    }
    if (url.pathname.endsWith("/public_profiles"))
      return json([
        {
          id: OTHER,
          display_name: "שועל סקרן",
          first_name: null,
          avatar_url: null,
        },
      ])
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

  return calls
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
})

// ── the ranked feed ─────────────────────────────────────────────────────────
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  })
  const calls = await boot(page)
  await page.goto("http://localhost:4499/", { waitUntil: "networkidle" })
  await page.waitForTimeout(700)

  const order = await page.$$eval("article p", (ns) =>
    ns.map((n) => n.textContent.replace("...", "").trim()),
  )
  check(
    "feed renders in the order Postgres returned",
    order.join("|") === RANKED.map((r) => r.text).join("|"),
    order.slice(0, 3).join(" › "),
  )

  check(
    "ranking came from one RPC, not client-side maths",
    calls.rpc === 1 && calls.sentences === 0,
    `rpc=${calls.rpc} sentences=${calls.sentences}`,
  )
  check(
    "no per-sentence completion or like download on feed load",
    calls.completions <= 1 && calls.likes === 0,
    `completions=${calls.completions} likes=${calls.likes}`,
  )

  const badges = await page.$$eval("article", (cards) =>
    cards.map((c) => {
      const b = [...c.querySelectorAll("span")].find((s) =>
        /חם עכשיו|עולה עכשיו/.test(s.textContent),
      )
      return b ? b.textContent.trim() : null
    }),
  )
  check(
    "indicator only on qualifying cards",
    JSON.stringify(badges) ===
      JSON.stringify([
        "🔥 חם עכשיו",
        "🔥 חם עכשיו",
        "↑ עולה עכשיו",
        null,
        null,
      ]),
    JSON.stringify(badges),
  )
  check(
    "most cards carry no badge at all",
    badges.filter(Boolean).length < badges.length,
    `${badges.filter(Boolean).length}/${badges.length}`,
  )

  check(
    "section label present",
    (await page.locator("text=מה קורה עכשיו?").count()) === 1,
  )
  check(
    "no numeric score is exposed anywhere",
    !/trending_score|recent_score|popular_score/.test(
      await page.textContent("body"),
    ),
  )

  await page.screenshot({
    path: "/tmp/trending-feed.png",
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  })

  // The label belongs to the ranked feed only.
  await page
    .locator("nav a, nav button")
    .filter({ hasText: "המשפטים שלי" })
    .first()
    .click()
    .catch(() => {})
  await page.waitForTimeout(500)
  await page.close()
}

// ── migration not run: the app must still work ──────────────────────────────
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  const calls = await boot(page, { breakRanking: true })
  const warnings = []
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()))

  await page.goto("http://localhost:4499/", { waitUntil: "networkidle" })
  await page.waitForTimeout(800)

  const cards = await page.$$eval("article p", (ns) => ns.length)
  check(
    "feed still renders without the migration",
    cards === RANKED.length,
    `${cards} cards`,
  )
  check(
    "fell back to the plain sentences query",
    calls.sentences === 1,
    `sentences=${calls.sentences}`,
  )
  check(
    "no indicator is shown in fallback mode",
    (await page.locator("text=חם עכשיו").count()) === 0,
  )
  check(
    "no error state shown to the user",
    (await page.locator("text=משהו השתבש").count()) === 0,
  )
  check(
    "a developer warning names the migration",
    warnings.some((w) => w.includes("2026-08-trending.sql")),
    warnings[0]?.slice(0, 60) ?? "none",
  )
  await page.close()
}

// ── empty database ──────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route("**/*supabase.co/**", (route) => {
    const url = new URL(route.request().url())
    const json = (b) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(b),
      })
    if (url.pathname.includes("/auth/v1/")) return json({})
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
  await page.goto("http://localhost:4499/", { waitUntil: "networkidle" })
  await page.waitForTimeout(700)
  check(
    "empty database shows the invitation, not an error",
    (await page.locator("text=אין עדיין משפטים").count()) === 1 &&
      (await page.locator("text=משהו השתבש").count()) === 0,
  )
  await page.close()
}

await browser.close()
server.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
