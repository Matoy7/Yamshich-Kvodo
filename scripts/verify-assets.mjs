// Fails the build if any file in dist/assets is a Git LFS pointer instead of
// real binary content. Guards against assets silently shipping as 132-byte
// text stubs when LFS objects are not fetched during CI checkout.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const dir = "dist/assets"
const LFS_MAGIC = "version https://git-lfs.github.com/spec/v1"
const broken = []

for (const name of readdirSync(dir)) {
  const file = join(dir, name)
  if (!statSync(file).isFile()) continue
  const head = readFileSync(file).subarray(0, 64).toString("utf8")
  if (head.startsWith(LFS_MAGIC)) broken.push(name)
}

if (broken.length) {
  console.error(
    `\n[verify-assets] ${broken.length} asset(s) are Git LFS pointers, not real files:\n` +
      broken.map((b) => `  - ${b}`).join("\n") +
      `\n\nThese would deploy as broken images. Commit the real binaries, or\n` +
      `fetch LFS objects during checkout (actions/checkout with lfs: true).\n`,
  )
  process.exit(1)
}

console.log(
  `[verify-assets] OK — ${readdirSync(dir).length} files in ${dir}, no LFS pointers.`,
)
