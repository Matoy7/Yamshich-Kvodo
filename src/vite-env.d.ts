/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Publishable / anon key. Public by design; never a service-role key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Optional alias, accepted for convenience. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
