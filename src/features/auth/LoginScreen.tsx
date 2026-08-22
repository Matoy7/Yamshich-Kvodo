import { Button } from '@/components/ui/Button'
import { GoogleIcon, FacebookIcon } from './ProviderIcons'
import { assets } from '@/lib/assets'

type LoginScreenProps = {
  brandName: string
  brandTagline: string
  privacyNote: string
  /** Called with the chosen provider. No credentials are handled here. */
  onContinue?: (provider: 'google' | 'facebook') => void
}

/**
 * Authentication screen. Reuses the dashboard's palette, typography, radius
 * and control sizes so it reads as the same product — the illustration is the
 * same asset the dashboard header uses.
 */
export function LoginScreen({
  brandName,
  brandTagline,
  privacyNote,
  onContinue,
}: LoginScreenProps) {
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
          <div className="flex w-full flex-col gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              iconStart={<GoogleIcon />}
              onClick={() => onContinue?.('google')}
            >
              המשך עם Google
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              iconStart={<FacebookIcon />}
              onClick={() => onContinue?.('facebook')}
            >
              המשך עם Facebook
            </Button>
          </div>

          <p className="text-caption text-content-muted">{privacyNote}</p>
        </div>
      </div>
    </main>
  )
}
