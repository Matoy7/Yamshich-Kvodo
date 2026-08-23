import { createAvatar } from "@dicebear/core"
import { personas } from "@dicebear/collection"

/**
 * Isolated so the lazy chunk contains this one style only.
 *
 * A dynamic `import('@dicebear/collection')` would pull the whole namespace —
 * all 31 styles, ~656 KB gzipped — because the property is read at runtime and
 * cannot be tree-shaken. Importing `notionists` by name here lets the bundler
 * drop the rest, and this module is what gets loaded on demand.
 */
export function buildAvatar(seed: string, backgroundColor: string): string {
  return createAvatar(personas, {
    seed,
    backgroundColor: [backgroundColor],
    radius: 50,
  }).toDataUri()
}
