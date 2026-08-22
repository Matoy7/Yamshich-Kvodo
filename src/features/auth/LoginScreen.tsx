import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from './ProviderIcons'
import { supabase, authRedirectUrl } from '@/lib/supabase'
import { assets } from '@/lib/assets'

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
export function LoginScreen({ brandName, brandTagline, privacyNote }: LoginScreenProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setPending(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })

    if (signInError) {
      setError('ההתחברות נכשלה. נסו שוב.')
      setPending(false)
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
          <h1 className="font-display text-display font-bold text-content-primary">{brandName}</h1>
          <p className="text-body text-content-secondary">{brandTagline}</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending}
            iconStart={<GoogleIcon />}
            onClick={signIn}
          >
            {pending ? 'מתחבר…' : 'המשך עם Google'}
          </Button>

          {error ? (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          ) : null}

          <p className="text-caption text-content-muted">{privacyNote}</p>
        </div>
      </div>
    </main>
  )
}
