import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Section } from "@/components/layout/Section"
import { EmptyState } from "@/components/ui/EmptyState"
import { HeroBanner } from "@/features/home/HeroBanner"
import { SentenceGrid } from "@/features/home/SentenceGrid"
import { CompletionDialog } from "@/features/home/CompletionDialog"
import { useFeed } from "@/features/home/useFeed"
import { LoginScreen } from "@/features/auth/LoginScreen"
import { useSession } from "@/features/auth/useSession"
import {
  canUpgradeAccount,
  displayNameFor,
  providerAvatarUrl,
} from "@/features/auth/profile"
import { useGeneratedAvatar } from "@/lib/avatar"
import {
  beginAccountLink,
  consumeAccountLinkOutcome,
  type LinkResult,
} from "@/features/auth/linkAccount"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { navItems } from "@/data/navigation"
import {
  createCompletion,
  createSentence,
  type FeedView,
  type Sentence,
} from "@/data/sentences"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { assets } from "@/lib/assets"

const PRODUCT_NAME = "ימשיך כבודו"
const TAGLINE = "אתה מתחיל. האינטרנט משלים."
const PRIVACY_NOTE = "הפרטים שלך נשארים אצלנו ולא יפורסמו."
const COMPOSER_PLACEHOLDER =
  'כאן שמים את תחילת המשפט. לא צריך שלוש נקודות אנחנו נשלים אותם עבורכם. (לדוגמה "בא לי לאכול היום")'

export default function App() {
  const { session, loading: sessionLoading, displayName } = useSession()
  const [view, setView] = useState<FeedView>("home")
  const [completing, setCompleting] = useState<Sentence | null>(null)
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null)
  const [confirmGuestSignOut, setConfirmGuestSignOut] = useState(false)

  // Provider picture when there is one; otherwise the deterministic generated
  // avatar, loaded lazily so it never weighs down the first paint.
  const providerAvatar = session ? providerAvatarUrl(session.user) : null
  const generatedAvatar = useGeneratedAvatar(
    session && !providerAvatar ? session.user.id : null,
  )

  // Reports the result of an account-link redirect, once per return trip.
  // A cancelled attempt is silent: the guest session is left exactly as it was.
  useEffect(() => {
    consumeAccountLinkOutcome()
      .then((result) => {
        if (result && result.outcome !== "cancelled") setLinkResult(result)
      })
      .catch(() => {})
  }, [])

  const startAccountLink = useCallback(async () => {
    const failure = await beginAccountLink()
    if (failure) setLinkResult({ outcome: "failed", detail: failure })
  }, [])

  const userId = session?.user.id
  const {
    sentences,
    completedIds,
    authorNames,
    leadingCompletions,
    loading,
    error,
    reload,
    refreshLeadingCompletion,
  } = useFeed(view, userId)

  const handleCreateSentence = useCallback(
    async (text: string) => {
      if (!userId) return
      await createSentence(text, userId)
      reload()
    },
    [userId, reload],
  )

  const handleCreateCompletion = useCallback(
    async (sentenceId: string, text: string) => {
      if (!userId) return
      await createCompletion(sentenceId, text, userId)
      reload()
    },
    [userId, reload],
  )

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-[480px]">
          <EmptyState
            title="החיבור ל-Supabase לא מוגדר"
            description="חסרים המשתנים VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY. ראו את קובץ README."
          />
        </div>
      </main>
    )
  }

  if (sessionLoading) {
    // Visible on purpose: an empty element here means a blank page whenever
    // the session check is slow or stalls.
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4"
      >
        <img
          src={assets.heroIllustration}
          alt=""
          aria-hidden
          width={96}
          height={96}
          className="size-24 animate-pulse rounded-full bg-surface-secondary object-cover"
        />
        <p className="text-body text-content-secondary">טוען…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <LoginScreen
        brandName={PRODUCT_NAME}
        brandTagline={TAGLINE}
        privacyNote={PRIVACY_NOTE}
      />
    )
  }

  // Guests show their generated name once the profile sync resolves; until
  // then the neutral placeholder. Never blank or undefined.
  const userName = displayName ?? displayNameFor(session.user)
  const avatarUrl = providerAvatar ?? generatedAvatar ?? assets.heroIllustration

  return (
    <>
      <DashboardLayout
        brandName={PRODUCT_NAME}
        brandTagline={TAGLINE}
        navItems={navItems}
        activeNavId={view}
        searchPlaceholder="חיפוש"
        userName={userName}
        avatarUrl={avatarUrl}
        canUpgrade={canUpgradeAccount(session.user)}
        hasNotifications
        onSelectNav={(id) => setView(id as FeedView)}
        onUpgrade={startAccountLink}
        onSignOut={() => {
          // A guest's identity lives only in this browser's session. Signing
          // out discards it, and with it the way back to their sentences —
          // unless they linked Google first. Ask before that happens.
          if (canUpgradeAccount(session.user)) setConfirmGuestSignOut(true)
          else void supabase.auth.signOut()
        }}
      >
        <HeroBanner
          label="התחלת משפט חדש"
          ctaLabel="התחל משפט"
          composerPlaceholder={COMPOSER_PLACEHOLDER}
          onStart={handleCreateSentence}
        />

        {/* Labelled only on the ranked feed — "what's happening now" would be
            a lie above a personal, chronological list. */}
        <Section
          title={view === "home" ? "מה קורה עכשיו?" : undefined}
          description={
            view === "home" ? "המשפטים שאנשים משלימים ממש עכשיו" : undefined
          }
        >
          <SentenceGrid
            sentences={sentences}
            completedIds={completedIds}
            authorNames={authorNames}
            leadingCompletions={leadingCompletions}
            currentUserId={session.user.id}
            view={view}
            loading={loading}
            error={error}
            onComplete={setCompleting}
            onLikeChange={refreshLeadingCompletion}
          />
        </Section>
      </DashboardLayout>

      <CompletionDialog
        sentence={completing}
        onClose={() => setCompleting(null)}
        onSubmit={handleCreateCompletion}
      />

      <Modal
        open={confirmGuestSignOut}
        onClose={() => setConfirmGuestSignOut(false)}
        title="לצאת מחשבון האורח?"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmGuestSignOut(false)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={() => {
                setConfirmGuestSignOut(false)
                void supabase.auth.signOut()
              }}
            >
              צא בכל זאת
            </Button>
          </>
        }
      >
        <p className="text-body text-content-secondary">
          חשבון האורח קיים רק בדפדפן הזה. אם תצאו, לא נוכל לשחזר אותו — והמשפטים
          וההשלמות שלכם לא יהיו נגישים יותר.
        </p>
        <p className="text-body-sm text-content-muted">
          כדי לשמור אותם, סגרו את החלון ובחרו "כניסה עם Google" בתפריט החשבון.
        </p>
      </Modal>

      <Modal
        open={linkResult !== null}
        onClose={() => setLinkResult(null)}
        title={
          linkResult?.outcome === "linked"
            ? "החשבון נשמר 🎉"
            : "שמירת החשבון לא הושלמה"
        }
        footer={
          <Button
            variant="primary"
            size="md"
            onClick={() => setLinkResult(null)}
          >
            סגירה
          </Button>
        }
      >
        <p className="text-body text-content-secondary">
          {linkResult?.outcome === "linked"
            ? "המשפטים וההשלמות שלך איתך גם בפעם הבאה."
            : linkResult?.outcome === "conflict"
              ? "חשבון Google הזה כבר משויך למשתמש אחר. התחברו איתו ישירות, או נסו חשבון Google אחר. המשפטים שלכם כאן לא נפגעו."
              : "לא הצלחנו לשמור את החשבון, ונשארתם מחוברים כאורח. שום דבר לא אבד — אפשר לנסות שוב."}
        </p>
        {linkResult?.detail && linkResult.outcome !== "linked" ? (
          <p dir="ltr" className="text-caption text-content-muted">
            {linkResult.detail}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
