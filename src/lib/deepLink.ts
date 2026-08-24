/** Matches the route shape anywhere in a pathname, regardless of how many
 *  segments come before it — so it works the same in local dev (site root)
 *  and under the GitHub Pages sub-path, without needing to know that prefix. */
const ROUTE_PATTERN = /\/sentence\/([^/]+)\/completion\/([^/]+)\/?$/

export type DeepLinkRoute = {
  sentenceId: string
  completionId: string
}

/** Parses `/sentence/:id/completion/:id` out of a pathname — by default the
 *  current page's. Null when the current URL isn't a shared-completion link. */
export function parseDeepLink(
  pathname: string = window.location.pathname,
): DeepLinkRoute | null {
  const match = ROUTE_PATTERN.exec(pathname)
  if (!match) return null
  return {
    sentenceId: decodeURIComponent(match[1]),
    completionId: decodeURIComponent(match[2]),
  }
}

/**
 * The canonical, shareable URL for a sentence's current leading completion.
 *
 * Built from the page's own origin + path, never a hardcoded domain, so it
 * is correct in local dev and under the GitHub Pages sub-path alike. Safe to
 * call only from the main feed card: that is the sole place "שתף" appears
 * (see AGENTS.md-equivalent note in ShareButton.tsx), and the feed is always
 * at the app's own root path — never itself a deep link — so
 * window.location.pathname here is reliably that root.
 */
export function buildShareUrl(
  sentenceId: string,
  completionId: string,
): string {
  const root = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`
  return (
    `${window.location.origin}${root}` +
    `sentence/${encodeURIComponent(sentenceId)}/completion/${encodeURIComponent(completionId)}`
  )
}

/**
 * The canonical link that actually gets shared — the Supabase Edge
 * Function's own URL (see supabase/functions/share), not this site directly.
 *
 * This is the one piece of the sharing feature that genuinely needs a
 * server: GitHub Pages serves static files only, and a social crawler never
 * runs this app's JavaScript, so nothing client-side can show it a dynamic
 * preview. The Edge Function at this URL serves crawlers real
 * server-rendered OG tags plus a dynamic image, and sends a real person on
 * to the app in a single redirect — see that function's own header comment
 * for the full explanation. From a person's side nothing changes: they
 * click the link and land on the real app almost instantly.
 *
 * Falls back to the plain app URL when there's no Supabase URL to derive a
 * function URL from (mirrors isSupabaseConfigured's own check elsewhere) —
 * sharing still works, just without a rich preview until the function is
 * deployed; see supabase/functions/share/README-DEPLOY.md.
 */
export function buildEdgeShareUrl(
  sentenceId: string,
  completionId: string,
): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (!supabaseUrl) return buildShareUrl(sentenceId, completionId)

  const origin = supabaseUrl.replace(/\/$/, "")
  return (
    `${origin}/functions/v1/share/sentence/${encodeURIComponent(sentenceId)}` +
    `/completion/${encodeURIComponent(completionId)}`
  )
}

/** Leaves the deep-link view for the ordinary feed: clears the URL back to
 *  the app root without a reload, so the person keeps their session. */
export function clearDeepLink(): void {
  const root = window.location.pathname.replace(/sentence\/.*$/, "")
  window.history.replaceState(null, "", root || "/")
}
