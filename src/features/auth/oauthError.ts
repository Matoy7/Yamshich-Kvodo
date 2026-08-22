/**
 * Reads an OAuth failure handed back on the callback URL.
 *
 * Supabase reports failures by redirecting to the app with `error`,
 * `error_code` and `error_description` — sometimes in the query string,
 * sometimes in the hash fragment. Without reading them the app just shows the
 * login screen again and the user has no idea what went wrong.
 */
export type OAuthError = {
  code: string | null
  description: string | null
  message: string
}

const MESSAGES: Record<string, string> = {
  bad_oauth_state:
    'ההתחברות התחילה בכתובת אחת והסתיימה באחרת, ולכן פג תוקף האימות. ודאו שכתובת האתר מופיעה ברשימת ה-Redirect URLs בהגדרות Supabase, ונסו שוב.',
  provider_email_needs_verification: 'צריך לאמת את כתובת המייל אצל הספק לפני הכניסה.',
  access_denied: 'הכניסה בוטלה.',
  otp_expired: 'פג תוקף הקישור. נסו להתחבר שוב.',
}

function paramsFrom(source: string): URLSearchParams {
  return new URLSearchParams(source.replace(/^[#?]/, ''))
}

export function readOAuthError(): OAuthError | null {
  if (typeof window === 'undefined') return null

  const query = paramsFrom(window.location.search)
  const hash = paramsFrom(window.location.hash)
  const pick = (key: string) => query.get(key) ?? hash.get(key)

  const error = pick('error')
  const code = pick('error_code')
  const description = pick('error_description')

  if (!error && !code && !description) return null

  return {
    code,
    description,
    message:
      (code && MESSAGES[code]) ||
      description ||
      'ההתחברות נכשלה. נסו שוב.',
  }
}

/** Removes the error parameters so a refresh does not re-show the message. */
export function clearOAuthError(): void {
  if (typeof window === 'undefined') return
  const clean = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState({}, '', clean)
}
