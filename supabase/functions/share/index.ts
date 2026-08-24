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
<meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
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

let fontsPromise: Promise<{ alef: ArrayBuffer; rubik: ArrayBuffer }> | null = null
let wasmReady: Promise<void> | null = null

/** Fetched once per warm function instance, not once per request. */
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/alef@latest/hebrew-700-normal.woff",
      ).then((r) => r.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/rubik@latest/hebrew-400-normal.woff",
      ).then((r) => r.arrayBuffer()),
    ]).then(([alef, rubik]) => ({ alef, rubik }))
  }
  return fontsPromise
}

function loadResvgWasm() {
  if (!wasmReady) {
    wasmReady = fetch(
      "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
    )
      .then((r) => r.arrayBuffer())
      .then((buffer) => initWasm(buffer))
  }
  return wasmReady
}

/** Truncates to a sentence-ish length so the card never overflows —
 *  measuring exact width isn't available before satori lays it out, so this
 *  is a conservative character budget rather than a pixel one. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

async function renderOgImage(data: SharedData): Promise<Uint8Array> {
  const { alef, rubik } = await loadFonts()
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
            children: BRAND_NAME,
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
                  children: `${clip(data.sentenceText, 60)}...`,
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
                  children: clip(data.completionText, 70),
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
            children: `${data.authorName} · ♥ ${data.likeCount}`,
          },
        },
      ],
    },
  }

  const svg = await satori(tree as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Alef", data: alef, weight: 700, style: "normal" },
      { name: "Rubik", data: rubik, weight: 400, style: "normal" },
    ],
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

  const imageMatch = IMAGE_ROUTE.exec(url.pathname)
  if (imageMatch) {
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
      console.error("og image render failed", error)
      return new Response("image generation failed", { status: 500 })
    }
  }

  const pageMatch = SENTENCE_ROUTE.exec(url.pathname)
  if (pageMatch) {
    const [, sentenceId, completionId] = pageMatch
    const canonicalUrl = `${SITE_ORIGIN}/sentence/${sentenceId}/completion/${completionId}`

    // A real person: skip straight to the interactive app. This function's
    // own HTML below is for crawlers only.
    if (!isCrawler(userAgent)) {
      return Response.redirect(canonicalUrl, 302)
    }

    const data = await fetchSharedData(sentenceId, completionId)
    if (!data) return Response.redirect(canonicalUrl, 302)

    // Built from this same request's own path rather than a hardcoded
    // "/functions/v1/share" prefix, so it's correct whatever this function
    // ends up deployed/named as.
    const functionBase = url.pathname.slice(
      0,
      url.pathname.indexOf("/sentence/"),
    )
    const imageUrl = `${url.origin}${functionBase}/og-image/${sentenceId}/${completionId}.png`
    const html = renderCrawlerHtml(data, canonicalUrl, imageUrl)
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }

  return new Response("not found", { status: 404 })
})
