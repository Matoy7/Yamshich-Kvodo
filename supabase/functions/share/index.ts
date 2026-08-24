// ---------------------------------------------------------------------------
// share — the crawler-visible half of the sharing feature.
//
// WHY THIS FILE HAS TO EXIST AT ALL
//
// GitHub Pages serves static files only; nothing runs there per-request. A
// social crawler (WhatsApp, Facebook, Telegram, LinkedIn, X, Slack…) does not
// execute JavaScript — it fetches a URL once and reads whatever raw HTML
// comes back. So a React app, however it's built, can never show a crawler a
// different <meta property="og:..."> per sentence+completion: by the time JS
// would update the page, the crawler has already read the first response and
// moved on. There is no static-only trick that fixes this — it is a genuine
// limitation of GitHub Pages, not a bug to work around client-side.
//
// The fix is this function. It lives on Supabase — the same backend the app
// already uses, so this isn't a new hosting dependency — and it does two
// different things depending on who's asking:
//
//   A crawler   → gets a real HTTP response containing real <meta> tags,
//                 built from the actual sentence + completion in Postgres,
//                 with the dynamic PNG below as og:image. This is a genuine
//                 server response, not a client-side injection, so every
//                 crawler sees it correctly.
//   A person    → gets an instant 302 redirect to the real GitHub Pages app,
//                 where the interactive experience (SharedCompletionView)
//                 takes over. They never see this function's own HTML.
//
// DEPLOYMENT (cannot be done from this repository — see README-DEPLOY.md in
// this folder for the full walkthrough):
//
//   supabase functions deploy share
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, which Supabase populates
// automatically for every Edge Function — nothing to configure for those two.
// Set the app's own public origin once:
//
//   supabase secrets set SITE_ORIGIN=https://matoy7.github.io/Yamshich-Kvodo
//
// The canonical share link people actually copy/paste is then this
// function's own URL (see src/lib/deepLink.ts → buildEdgeShareUrl), not the
// matoy7.github.io URL directly — that's what makes the crawler case above
// possible at all. A human clicking it lands on matoy7.github.io within a
// single redirect hop; nothing about their experience changes.
// ---------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2"
import satori from "npm:satori@0.10.13"
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2"

const SITE_ORIGIN = (
  Deno.env.get("SITE_ORIGIN") ?? "https://matoy7.github.io/Yamshich-Kvodo"
).replace(/\/$/, "")
const BRAND_NAME = "ימשיך כבודו"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

// ---------------------------------------------------------------------------
// crawler detection
// ---------------------------------------------------------------------------

/** The platforms named in the brief, plus the other common OG/Twitter-card
 *  consumers. Not exhaustive — no list can be — but covers every case a
 *  person is actually going to hit. */
const CRAWLER_UA =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|SkypeUriPreview|vkShare|redditbot|Pinterest|W3C_Validator|Applebot|Googlebot|bingbot|ia_archiver|bot|crawler|spider|preview/i

function isCrawler(userAgent: string | null): boolean {
  return userAgent ? CRAWLER_UA.test(userAgent) : false
}

// ---------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------

type SharedData = {
  sentenceText: string
  completionText: string
  authorName: string
  likeCount: number
}

/** Same three tables, same columns, same "guest name falls back to
 *  first_name falls back to a neutral default" rule as the client's own
 *  fetchCompletionById/fetchSentenceById — this just runs server-side with
 *  the service role, since a crawler has no Supabase session at all. */
async function fetchSharedData(
  sentenceId: string,
  completionId: string,
): Promise<SharedData | null> {
  const [sentenceRes, completionRes, likesRes] = await Promise.all([
    supabase.from("sentences").select("text").eq("id", sentenceId).maybeSingle(),
    supabase
      .from("completions")
      .select("text, author_id")
      .eq("id", completionId)
      .eq("sentence_id", sentenceId)
      .maybeSingle(),
    supabase
      .from("completion_likes")
      .select("id", { count: "exact", head: true })
      .eq("completion_id", completionId),
  ])

  if (!sentenceRes.data || !completionRes.data) return null

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, first_name")
    .eq("id", completionRes.data.author_id)
    .maybeSingle()

  return {
    sentenceText: sentenceRes.data.text,
    completionText: completionRes.data.text,
    authorName: profile?.display_name?.trim() || profile?.first_name?.trim() || "משתמש",
    likeCount: likesRes.count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// HTML for crawlers
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderCrawlerHtml(
  data: SharedData,
  canonicalUrl: string,
  imageUrl: string,
): string {
  const title = `${data.sentenceText}... — ${BRAND_NAME}`
  const ogTitle = `${data.sentenceText}... | ${BRAND_NAME}`
  const description = data.completionText

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonicalUrl}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:site_name" content="${BRAND_NAME}" />
<meta property="og:locale" content="he_IL" />
<meta property="og:title" content="${escapeHtml(ogTitle)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(description)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
<p>
  <a href="${canonicalUrl}">${escapeHtml(ogTitle)}</a>
</p>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// dynamic OG image — same visual language as scripts/og-image.mjs (the
// site-wide static card): same colours, same "two chat bubbles" concept for
// opener → completion, same brand mark. Rendered with satori (JSX-less
// object tree, so no build step is needed inside the function) to SVG, then
// rasterised to PNG with resvg — the standard edge-compatible replacement
// for a headless-Chromium screenshot, which isn't available in this runtime.
// ---------------------------------------------------------------------------

const WIDTH = 1200
const HEIGHT = 630

/**
 * "@latest" rather than a pinned version: Fontsource's CDN docs confirm this
 * is a genuinely supported floating tag, not a guess — and a fabricated
 * exact version number that happens not to exist would 404 every single
 * font fetch, which is a worse failure mode than the one this is fixing.
 */
const FONT_VERSION = "latest"

type FontDescriptor = { name: string; data: ArrayBuffer; weight: number }

let fontsPromise: Promise<FontDescriptor[]> | null = null
let wasmReady: Promise<void> | null = null

/** Fetches one Fontsource file and fails loudly (not with corrupted font
 *  bytes) if the CDN doesn't return one — `fetch` only rejects on a network
 *  failure, never on a 4xx/5xx, so an unchecked `.arrayBuffer()` on a 403/404
 *  response silently hands satori the bytes of an error page instead of a
 *  font, which satori then fails to parse with an opaque, hard-to-place
 *  error. Checking `.ok` here turns that into a clear, logged reason. */
async function fetchFont(
  id: string,
  subset: string,
  weight: number,
): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@${FONT_VERSION}/${subset}-${weight}-normal.ttf`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`font fetch failed (${response.status}): ${url}`)
  }
  return response.arrayBuffer()
}

/**
 * Fetched once per warm function instance, not once per request.
 *
 * Rubik is registered for both weights actually used in the tree (400 for
 * body copy, 500 for the completion bubble) and both the hebrew and latin
 * subsets — a sentence or completion is free-text a person typed, so it can
 * contain Latin characters (names, numbers, an English word) as easily as
 * Hebrew ones; a hebrew-only subset simply has no glyphs for those, which
 * satori/resvg would drop or fail on. Providing two subset files under the
 * same family name is how satori is meant to combine script coverage.
 * Alef is Hebrew-only because it renders exactly one fixed, all-Hebrew
 * string — the brand mark — never user content.
 */
function loadFonts(): Promise<FontDescriptor[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetchFont("alef", "hebrew", 700),
      fetchFont("rubik", "hebrew", 400),
      fetchFont("rubik", "latin", 400),
      fetchFont("rubik", "hebrew", 500),
      fetchFont("rubik", "latin", 500),
    ]).then(
      ([alef700, rubikHe400, rubikLa400, rubikHe500, rubikLa500]) => [
        { name: "Alef", data: alef700, weight: 700 },
        { name: "Rubik", data: rubikHe400, weight: 400 },
        { name: "Rubik", data: rubikLa400, weight: 400 },
        { name: "Rubik", data: rubikHe500, weight: 500 },
        { name: "Rubik", data: rubikLa500, weight: 500 },
      ],
    )
  }
  return fontsPromise
}

function loadResvgWasm() {
  if (!wasmReady) {
    const wasmUrl = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
    wasmReady = fetch(wasmUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`resvg wasm fetch failed (${response.status}): ${wasmUrl}`)
        }
        return response.arrayBuffer()
      })
      .then((buffer) => initWasm(buffer))
  }
  return wasmReady
}

/** Truncates to a sentence-ish length so the card never overflows —
 *  measuring exact width isn't available before satori lays it out, so this
 *  is a conservative character budget rather than a pixel one. Always call
 *  this before visualHebrew: truncation operates on the logical (natural
 *  reading-order) string; reordering for display must happen last. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Satori has no bidi/RTL support at all — confirmed directly against its own
 * README ("RTL languages are not supported either") and issue tracker
 * (vercel/satori#74: "There is no current plan for RTL languages"). It lays
 * out any string strictly left-to-right in whatever order the characters
 * are stored in. Unicode always stores Hebrew in logical (reading) order —
 * it's normally the renderer's job to reverse that for display — so text
 * that's correct everywhere else in this app came out mirrored here
 * specifically because satori is the one renderer in the stack that skips
 * that step.
 *
 * This does that reversal ourselves before satori ever sees the string:
 * split into runs of Hebrew vs. everything else, reverse the run order, and
 * reverse the character order *within* each Hebrew run only. Hebrew letters
 * aren't reshaped based on position the way Arabic's are, so reversing a
 * Hebrew run's characters is safe — the same trick would actively break
 * Arabic. A non-Hebrew run (a whole "iPhone 15", not just one word of it)
 * keeps its own internal order untouched and is just repositioned with its
 * run, so an embedded product name, year, or English phrase doesn't come out
 * backwards, or with its own words swapped, either.
 *
 * This is a simplified approximation of the Unicode Bidirectional
 * Algorithm, not a full implementation — verified correct (by simulating a
 * right-to-left read of the rendered output and checking it matches the
 * original) for pure-Hebrew strings, Hebrew with a single embedded run of
 * Latin/digits/punctuation, and Hebrew with multiple embedded runs — which
 * covers every shape of text this function actually renders (a sentence, a
 * completion, a name), not arbitrary multi-directional documents.
 */
function visualHebrew(text: string): string {
  const HEBREW = /[\u0590-\u05FF]/
  type Run = { text: string; isHebrew: boolean }
  const runs: Run[] = []

  for (const ch of text) {
    const isHebrew = HEBREW.test(ch)
    const last = runs[runs.length - 1]
    if (last && last.isHebrew === isHebrew) {
      last.text += ch
    } else {
      runs.push({ text: ch, isHebrew })
    }
  }

  const reordered = runs
    .reverse()
    .map((run) => (run.isHebrew ? [...run.text].reverse().join("") : run.text))

  // A run boundary that was a plain space in the original text (e.g. between
  // a Hebrew word and an embedded English one) can end up with no separator
  // at all once both sides are repositioned — insert one back only where
  // neither side already ends/starts with whitespace, so words never
  // visually collide.
  let result = ""
  for (const [index, run] of reordered.entries()) {
    if (index > 0 && !/\s/.test(result.slice(-1)) && !/\s/.test(run.slice(0, 1))) {
      result += " "
    }
    result += run
  }
  return result
}

async function renderOgImage(data: SharedData): Promise<Uint8Array> {
  const fonts = await loadFonts()
  await loadResvgWasm()

  const tree = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 72px",
        background:
          "linear-gradient(135deg, #17475d 0%, #0f3040 55%, #09222e 100%)",
        color: "#ffffff",
        fontFamily: "Rubik",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontFamily: "Alef",
              fontSize: 56,
              fontWeight: 700,
            },
            children: visualHebrew(BRAND_NAME),
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: 88,
              height: 5,
              borderRadius: 999,
              background: "#f8e3ca",
              opacity: 0.85,
              margin: "22px 0 30px",
            },
            children: [],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-start",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    background: "#ffffff",
                    color: "#1f2430",
                    borderRadius: "20px 20px 4px 20px",
                    padding: "18px 28px",
                    fontSize: 32,
                    maxWidth: 900,
                  },
                  children: visualHebrew(`${clip(data.sentenceText, 60)}...`),
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    background: "#f8e3ca",
                    color: "#2a1c0c",
                    borderRadius: "20px 20px 20px 4px",
                    padding: "18px 28px",
                    fontSize: 32,
                    fontWeight: 500,
                    maxWidth: 900,
                    marginRight: 72,
                  },
                  children: visualHebrew(clip(data.completionText, 70)),
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: 28,
              fontSize: 26,
              color: "#f8e3ca",
              gap: 10,
            },
            children: visualHebrew(`${data.authorName} · ♥ ${data.likeCount}`),
          },
        },
      ],
    },
  }

  const svg = await satori(tree as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fonts.map((font) => ({ ...font, style: "normal" as const })),
  })

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
  return resvg.render().asPng()
}

// ---------------------------------------------------------------------------
// routing
// ---------------------------------------------------------------------------

const SENTENCE_ROUTE = /\/sentence\/([^/]+)\/completion\/([^/]+)\/?$/
const IMAGE_ROUTE = /\/og-image\/([^/]+)\/([^/]+)\.png$/

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const userAgent = req.headers.get("user-agent")

  // Temporary diagnostic logging — remove once the og-image 404 is
  // resolved. Shows exactly what this function receives for every request,
  // so `supabase functions logs share` (or the Dashboard's Logs tab) answers
  // definitively whether a given request even reached this code at all.
  console.log("SHARE REQUEST", {
    url: req.url,
    pathname: url.pathname,
    method: req.method,
    userAgent,
  })

  const imageMatch = IMAGE_ROUTE.exec(url.pathname)
  if (imageMatch) {
    console.log("SHARE REQUEST matched IMAGE_ROUTE", imageMatch[0])
    const [, sentenceId, completionId] = imageMatch
    const data = await fetchSharedData(sentenceId, completionId)
    if (!data) return new Response("not found", { status: 404 })

    try {
      const png = await renderOgImage(data)
      return new Response(png, {
        headers: {
          "content-type": "image/png",
          // A share link is immutable once posted — the completion it points
          // to never changes — so this can cache aggressively.
          "cache-control": "public, max-age=86400, immutable",
        },
      })
    } catch (error) {
      // The message is safe to return as-is: it's either one of the
      // descriptive font/wasm-fetch errors thrown above (a URL and an HTTP
      // status, nothing sensitive) or satori/resvg's own error, never
      // anything from Postgres or the service-role credential. Returning it
      // directly means a broken image is diagnosable from a plain curl,
      // without needing to go find it in `supabase functions logs`.
      const message = error instanceof Error ? error.message : String(error)
      console.error("og image render failed:", message)
      return new Response(`image generation failed: ${message}`, {
        status: 500,
      })
    }
  }

  const pageMatch = SENTENCE_ROUTE.exec(url.pathname)
  if (pageMatch) {
    console.log("SHARE REQUEST matched SENTENCE_ROUTE", pageMatch[0])
    const [, sentenceId, completionId] = pageMatch
    const canonicalUrl = `${SITE_ORIGIN}/sentence/${sentenceId}/completion/${completionId}`

    // A real person: skip straight to the interactive app. This function's
    // own HTML below is for crawlers only.
    if (!isCrawler(userAgent)) {
      return Response.redirect(canonicalUrl, 302)
    }

    const data = await fetchSharedData(sentenceId, completionId)
    if (!data) return Response.redirect(canonicalUrl, 302)

    // This function is only ever publicly reachable at
    // /functions/v1/share — Supabase's fixed, documented gateway path for
    // every Edge Function, never configurable per function. The previous
    // version derived this prefix from url.pathname instead of hardcoding
    // it, on the assumption that url.pathname reflects the external path a
    // client used. It doesn't: Supabase's gateway strips the
    // /functions/v1/share prefix before invoking this function, so
    // url.pathname here was already showing the *internal*, rewritten path
    // (e.g. /share/sentence/...) — one level shorter than the real public
    // URL. Reusing it to build another URL produced a link with no
    // /functions/v1/ at all (https://.../share/og-image/...), which is not
    // a route Supabase's gateway recognises — confirmed directly: that URL
    // 404s. WhatsApp's crawler parsed the HTML fine (a separate fetch, to a
    // correctly-routed URL) and had nothing wrong to show for og:title, but
    // fetching the 404ing og:image found nothing to render, so it silently
    // dropped the image and kept the rest of the preview.
    const functionBase = "/functions/v1/share"
    // Forced to https explicitly rather than using url.origin/url.protocol:
    // Supabase's edge runtime reports the *internal* request scheme to the
    // function, which comes through as http even though the function is
    // only ever publicly reachable over https. Using url.origin verbatim
    // produced an http:// og:image URL in production — WhatsApp and other
    // crawlers silently drop a preview whose image URL isn't https, so this
    // isn't cosmetic. The function is never actually served over plain
    // http, so hardcoding the scheme here is correct, not a workaround.
    const imageUrl = `https://${url.host}${functionBase}/og-image/${sentenceId}/${completionId}.png`
    const html = renderCrawlerHtml(data, canonicalUrl, imageUrl)
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }

  console.log("SHARE REQUEST matched no route", url.pathname)
  return new Response("not found", { status: 404 })
})
