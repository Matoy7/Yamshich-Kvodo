/**
 * Fails the build if the link-preview card would not render.
 *
 * Every failure mode here is silent in production: the page looks perfect and
 * the link simply pastes into WhatsApp as bare text. These checks make each
 * one loud at build time instead.
 */
import { existsSync, readFileSync, statSync } from "node:fs"

const html = readFileSync("dist/index.html", "utf8")
const problems = []

/** Reads one meta tag's content, whichever attribute order Vite emitted. */
function meta(key) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']` +
      `|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  )
  const match = html.match(pattern)
  return match ? (match[1] ?? match[2]) : null
}

// 1 ── the tags a large preview card needs at all.
for (const key of [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
]) {
  if (!meta(key)) problems.push(`missing <meta ${key}>`)
}

// 2 ── absolute URLs. This is the one that bites: the rest of the build uses
// relative paths for sub-path hosting, and a relative og:image yields no
// thumbnail because the crawler has no base to resolve it against.
for (const key of ["og:image", "og:url"]) {
  const value = meta(key)
  if (value && !/^https:\/\//.test(value)) {
    problems.push(`${key} must be an absolute https:// URL, got "${value}"`)
  }
}

// 3 ── noindex and a Disallow-all robots.txt both keep preview crawlers away.
if (/content=["'][^"']*noindex/i.test(html)) {
  problems.push(
    '<meta name="robots" content="noindex"> blocks preview crawlers',
  )
}
if (
  existsSync("dist/robots.txt") &&
  /Disallow:\s*\/\s*$/m.test(readFileSync("dist/robots.txt", "utf8"))
) {
  problems.push(
    "robots.txt disallows everything, which blocks preview crawlers",
  )
}

// 4 ── the image file itself: present, and small enough for WhatsApp, which
// drops oversized images back to no thumbnail.
const MAX_KB = 300
const image = meta("og:image")
if (image) {
  const local = `dist/${image.split("/").pop()}`
  if (!existsSync(local)) {
    problems.push(
      `og:image points at ${image} but ${local} is not in the build output`,
    )
  } else {
    const kb = Math.round(statSync(local).size / 1024)
    if (kb > MAX_KB)
      problems.push(
        `${local} is ${kb} KB; keep it under ${MAX_KB} KB for WhatsApp`,
      )
  }
}

if (problems.length) {
  console.error(
    `\n[verify-social-card] link previews would not render:\n` +
      problems.map((p) => `  - ${p}`).join("\n") +
      `\n\nSee the meta block in index.html and .figma/make/site.json.\n`,
  )
  process.exit(1)
}

console.log(`[verify-social-card] OK — ${meta("og:image")}`)
