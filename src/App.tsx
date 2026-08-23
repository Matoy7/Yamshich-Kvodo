import { useCallback, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Section } from '@/components/layout/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { HeroBanner } from '@/features/home/HeroBanner'
import { SentenceGrid } from '@/features/home/SentenceGrid'
import { CompletionDialog } from '@/features/home/CompletionDialog'
import { useFeed } from '@/features/home/useFeed'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { useSession } from '@/features/auth/useSession'
import { avatarUrlFor, displayNameFor } from '@/features/auth/profile'
import { navItems } from '@/data/navigation'
import { createCompletion, createSentence, type FeedView, type Sentence } from '@/data/sentences'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { assets } from '@/lib/assets'

const PRODUCT_NAME = 'ימשיך כבודו'
const TAGLINE = 'שני אנשים. משפט אחד.'
const PRIVACY_NOTE = 'הפרטים שלך נשארים אצלנו ולא יפורסמו.'
const COMPOSER_PLACEHOLDER =
  'כאן שמים את תחילת המשפט. לא צריך שלוש נקודות אנחנו נשלים אותם עבורכם. (לדוגמה "בא לי לאכול היום")'

export default function App() {
  const { session, loading: sessionLoading } = useSession()
  const [view, setView] = useState<FeedView>('home')
  const [completing, setCompleting] = useState<Sentence | null>(null)

  const userId = session?.user.id
  const { sentences, completedIds, loading, error, reload } = useFeed(view, userId)

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

  // Guests render as "אורח" with the bundled avatar; never blank or undefined.
  const userName = displayNameFor(session.user)
  const avatarUrl = avatarUrlFor(session.user)

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
        hasNotifications
        onSelectNav={(id) => setView(id as FeedView)}
        onSignOut={() => supabase.auth.signOut()}
      >
        <HeroBanner
          label="התחלת משפט חדש"
          ctaLabel="התחל משפט"
          composerPlaceholder={COMPOSER_PLACEHOLDER}
          onStart={handleCreateSentence}
        />

        <Section>
          <SentenceGrid
            sentences={sentences}
            completedIds={completedIds}
            currentUserId={session.user.id}
            view={view}
            loading={loading}
            error={error}
            onComplete={setCompleting}
          />
        </Section>
      </DashboardLayout>

      <CompletionDialog
        sentence={completing}
        onClose={() => setCompleting(null)}
        onSubmit={handleCreateCompletion}
      />
    </>
  )
}
