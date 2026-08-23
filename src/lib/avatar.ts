import { useEffect, useState } from 'react'

/**
 * Deterministic illustrated avatars.
 *
 * Generated locally rather than through api.dicebear.com: the seed is the
 * Supabase user id, and sending that to a third party on every page load is
 * both a needless dependency and a needless disclosure. Local generation also
 * means no network request and no failure mode when the service is down.
 *
 * The generator is ~180 KB gzipped, so it is loaded on demand rather than in
 * the main bundle — the login screen never needs it. Until it resolves the UI
 * falls back to the bundled illustration.
 *
 * The same id always produces the same picture, so a returning guest keeps the
 * face they had, and different ids look different.
 */

/** Backgrounds drawn from the app's own palette. */
const BACKGROUNDS = ['e5e9fa', 'f4effc', 'f6f1fe', 'e6e8f0'] as const

const cache = new Map<string, string>()
let generator: Promise<(seed: string) => string> | null = null

function loadGenerator(): Promise<(seed: string) => string> {
  generator ??= import('./avatarGenerator').then(
    ({ buildAvatar }) =>
      (seed: string) => {
        // Stable per id, so the background never changes between renders.
        let hash = 0
        for (let index = 0; index < seed.length; index += 1) {
          hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
        }
        return buildAvatar(seed, BACKGROUNDS[hash % BACKGROUNDS.length])
      },
  )
  return generator
}

/** Already-generated avatar for this id, if one has been made this session. */
export function cachedAvatar(userId: string): string | undefined {
  return cache.get(userId)
}

/** Generated avatars for a set of ids, for lists of authors. */
export function useGeneratedAvatars(userIds: string[]): Record<string, string> {
  const key = userIds.join(',')
  const [map, setMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) {
      setMap({})
      return
    }

    let active = true
    loadGenerator()
      .then((build) => {
        const next: Record<string, string> = {}
        for (const id of ids) {
          let existing = cache.get(id)
          if (!existing) {
            let hash = 0
            for (let index = 0; index < id.length; index += 1) {
              hash = (hash * 31 + id.charCodeAt(index)) >>> 0
            }
            existing = build(id)
            cache.set(id, existing)
          }
          next[id] = existing
        }
        if (active) setMap(next)
      })
      .catch((error) => console.error('avatar generation failed', error))

    return () => {
      active = false
    }
  }, [key])

  return map
}

/**
 * Resolves the generated avatar for a user id, or null while the generator is
 * still loading. Pass null to skip generation entirely.
 */
export function useGeneratedAvatar(userId: string | null): string | null {
  const [dataUri, setDataUri] = useState<string | null>(() =>
    userId ? (cache.get(userId) ?? null) : null,
  )

  useEffect(() => {
    if (!userId) {
      setDataUri(null)
      return
    }

    const existing = cache.get(userId)
    if (existing) {
      setDataUri(existing)
      return
    }

    let active = true
    loadGenerator()
      .then((build) => {
        const uri = build(userId)
        cache.set(userId, uri)
        if (active) setDataUri(uri)
      })
      .catch((error) => {
        console.error('avatar generation failed', error)
      })

    return () => {
      active = false
    }
  }, [userId])

  return dataUri
}
