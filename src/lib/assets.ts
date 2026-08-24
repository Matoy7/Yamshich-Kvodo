/**
 * Static asset registry.
 *
 * Paths resolve against Vite's BASE_URL so every asset keeps working when the
 * site is served from a GitHub Pages sub-path (e.g. /Yamshich-Kvodo/assets/…).
 * The hashed files are the original Figma Make exports — do not substitute
 * them. The two heart icons are project-authored, drawn on the same 24px grid
 * and in the same flat style, because likes arrived after the Figma export.
 *
 * Their colours are baked into the SVG — as with every icon here, which render
 * as <img> and so cannot be recoloured by CSS: muted grey at rest, the accent
 * token when active.
 */
const base = `${import.meta.env.BASE_URL}assets`

export const assets = {
  heroIllustration: `${base}/b4624.png`,
  profileAvatar: `${base}/02a96.png`,
  iconPerson: `${base}/8fa3b.svg`,
  iconQuote: `${base}/e9844.svg`,
  iconBell: `${base}/47618.svg`,
  iconHome: `${base}/1f5ca.svg`,
  iconPencil: `${base}/3e727.svg`,
  iconChat: `${base}/a099a.svg`,
  iconHeart: `${base}/heart-outline.svg`,
  iconHeartFilled: `${base}/heart-filled.svg`,
  iconChevronStart: `${base}/chevron-start.svg`,
  /** Small status indicator for the currently leading completion (by likes).
   *  Project-authored, since a crown was not part of the original Figma Make
   *  export — a warm gold fill by design, the one icon in this set that
   *  isn't muted grey, since it marks a distinct status rather than a
   *  neutral action. */
  iconCrown: `${base}/crown-status.svg`,
} as const

export type AssetKey = keyof typeof assets
