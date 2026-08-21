/**
 * Static asset registry.
 *
 * Paths resolve against Vite's BASE_URL so every asset keeps working when the
 * site is served from a GitHub Pages sub-path (e.g. /Yamshich-Kvodo/assets/…).
 * All files are the original Figma Make exports — do not substitute them.
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
} as const

export type AssetKey = keyof typeof assets
