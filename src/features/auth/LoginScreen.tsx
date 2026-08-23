import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { GoogleIcon } from "./ProviderIcons"
import { supabase, authRedirectUrl } from "@/lib/supabase"
import { clearOAuthError, readOAuthError } from "./oauthError"
import { assets } from "@/lib/assets"

type LoginScreenProps = {
  brandName: string
  brandTagline: string
  privacyNote: string
}

/**
 * Authentication screen. Reuses the dashboard's palette, typography, radius
 * and control sizes so it reads as the same product — the illustration is the
 * same asset the dashboard header uses.
 *
 * Sign-in is delegated entirely to the provider: this screen never sees or
 * stores a credential.
 */
export function LoginScreen({
  brandName,
  brandTagline,
  privacyNote,
}: LoginScreenProps) {
  const [pending, setPending] = useState<null | "google" | "guest">(null)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string | null>(null)

  // Surface a failure handed back on the callback URL instead of silently
  // dropping the user back on this screen with no explanation.
  useEffect(() => {
    const failure = readOAuthError()
    if (!failure) return
    setError(failure.message)
    setDetails(
      failure.code
        ? `${failure.code}: ${failure.description ?? ""}`.trim()
        : null,
    )
    clearOAuthError()
  }, [])

  async function signIn() {
    setPending("google")
    setError(null)
    setDetails(null)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectUrl() },
    })

    if (signInError) {
      setError("ההתחברות נכשלה. נסו שוב.")
      setPending(null)
    }
  }

  /**
   * Guest access. Creates a real Supabase user with the `authenticated` role,
   * so `auth.uid()` and every existing RLS policy apply unchanged — there is
   * no redirect and no form.
   *
   * Only reachable when there is no session at all, so an existing guest
   * session is never replaced by a new anonymous user.
   */
  async function signInAsGuest() {
    setPending("guest")
    setError(null)
    setDetails(null)

    const { error: guestError } = await supabase.auth.signInAnonymously()

    if (guestError) {
      const disabled = /anonymous.*disabled|signups? not allowed/i.test(
        guestError.message,
      )
      setError(
        disabled
          ? "כניסת אורחים אינה מופעלת בפרויקט. יש להפעיל Anonymous Sign-Ins בהגדרות Supabase."
          : "הכניסה כאורח נכשלה. נסו שוב.",
      )
      setDetails(guestError.message)
      setPending(null)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-8 text-center">
        <img
          src={assets.heroIllustration}
          alt="איור של אישה כותבת ביומן"
          width={160}
          height={160}
          className="size-32 shrink-0 rounded-full bg-surface-secondary object-cover md:size-40"
        />

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-display font-bold text-content-primary">
            {brandName}
          </h1>
          <p className="text-body-lg text-content-secondary">{brandTagline}</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending !== null}
            iconStart={<GoogleIcon />}
            onClick={signIn}
          >
            {pending === "google" ? "מתחבר…" : "המשך עם Google"}
          </Button>

          {/* Secondary, deliberately subordinate: ghost variant at the smaller
              `md` control height, so it reads as a text action rather than a
              second call to action. */}
          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-content-muted/25" />
            <span className="text-caption text-content-muted">או</span>
            <span className="h-px flex-1 bg-content-muted/25" />
          </div>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            disabled={pending !== null}
            onClick={signInAsGuest}
          >
            {pending === "guest" ? "נכנס…" : "המשך כאורח"}
          </Button>

          {error ? (
            <div role="alert" className="flex flex-col gap-1 text-start">
              <p className="text-caption text-danger">{error}</p>
              {details ? (
                <p dir="ltr" className="text-caption text-content-muted">
                  {details}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="text-caption text-content-muted">{privacyNote}</p>
        </div>
      </div>
    </main>
  )
}
