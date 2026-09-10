import { useCallback, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Section } from "@/components/layout/Section"
import { EmptyState } from "@/components/ui/EmptyState"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
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
import { assets } from "@/lib/assets"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

import { useMyFamilies } from "@/features/names/useMyFamilies"
import { useFamilyNames } from "@/features/names/useFamilyNames"
import { FamilySwitcher } from "@/features/names/FamilySwitcher"
import { SuggestNameForm } from "@/features/names/SuggestNameForm"
import { NameGrid, type NameGridView } from "@/features/names/NameGrid"
import { NameFiltersBar, EMPTY_NAME_FILTERS, type NameFiltersValue } from "@/features/names/NameFiltersBar"
import { RecommendedNames } from "@/features/names/RecommendedNames"
import { MyFamilyScreen } from "@/features/names/MyFamilyScreen"
import { suggestName } from "@/data/names"
import { redeemInvitation } from "@/data/families"

const PRODUCT_NAME = "שם טוב"
const TAGLINE = "בוחרים ביחד. שם אחד טוב."
const PRIVACY_NOTE = "ההצבעות שלך גלויות רק לבני המשפחה שלך."

type View = "browse" | "ranking" | "family"

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "browse", label: "עיון בשמות", icon: assets.iconHome },
  { id: "ranking", label: "דירוג המשפחה", icon: assets.iconCrown },
  { id: "family", label: "המשפחה שלי", icon: assets.iconPerson },
]

export default function App() {
  const { session, loading: sessionLoading, displayName } = useSession()
  const [view, setView] = useState<View>("browse")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<NameFiltersValue>(EMPTY_NAME_FILTERS)
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null)
  const [confirmGuestSignOut, setConfirmGuestSignOut] = useState(false)

  const providerAvatar = session ? providerAvatarUrl(session.user) : null
  const generatedAvatar = useGeneratedAvatar(
    session && !providerAvatar ? session.user.id : null,
  )

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
    families,
    activeFamilyId,
    activeFamily,
    loading: familiesLoading,
    error: familiesError,
    reload: reloadFamilies,
    setActiveFamilyId,
    create: handleCreateFamily,
  } = useMyFamilies(userId)

  const gridView: NameGridView = view === "ranking" ? "ranking" : "browse"
  const {
    names,
    votes,
    loading: namesLoading,
    error: namesError,
    reload: reloadNames,
    toggleVote,
  } = useFamilyNames(activeFamilyId, userId, gridView, {
    search: searchQuery || undefined,
    gender: filters.gender,
    origins: filters.origins,
    meanings: filters.meanings,
    styles: filters.styles,
    popularities: filters.popularities,
    initial: filters.more.initial,
    endsWith: filters.more.endsWith,
    short: filters.more.short,
    easyInEnglish: filters.more.easyInEnglish,
    worksInternationally: filters.more.worksInternationally,
  })

  const handleJoinFamily = useCallback(
    async (token: string) => {
      const familyId = await redeemInvitation(token)
      setActiveFamilyId(familyId)
      // useMyFamilies reloads on its own effect deps; a family created
      // elsewhere still needs its roster row to exist before we can select
      // it, so a manual reload keeps the switcher's list honest immediately
      // rather than waiting for an unrelated re-render.
      window.setTimeout(() => setActiveFamilyId(familyId), 0)
    },
    [setActiveFamilyId],
  )

  const handleSuggestName = useCallback(
    async (text: string, gender: Parameters<typeof suggestName>[2], origin: string | null) => {
      if (!activeFamilyId || !userId) return
      await suggestName(activeFamilyId, text, gender, origin, userId)
      reloadNames()
    },
    [activeFamilyId, userId, reloadNames],
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

  const userName = displayName ?? displayNameFor(session.user)
  const avatarUrl = providerAvatar ?? generatedAvatar ?? assets.heroIllustration

  return (
    <>
      <DashboardLayout
        brandName={PRODUCT_NAME}
        brandTagline={TAGLINE}
        navItems={NAV_ITEMS}
        activeNavId={view}
        searchPlaceholder="חיפוש שם"
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onClearSearch={() => setSearchQuery("")}
        userName={userName}
        avatarUrl={avatarUrl}
        canUpgrade={canUpgradeAccount(session.user)}
        userId={userId}
        onSelectNav={(id) => setView(id as View)}
        onUpgrade={startAccountLink}
        onOpenNotification={(familyId) => {
          setActiveFamilyId(familyId)
          setView("ranking")
        }}
        onSignOut={() => {
          if (canUpgradeAccount(session.user)) setConfirmGuestSignOut(true)
          else void supabase.auth.signOut()
        }}
      >
        {familiesLoading ? (
          <Section title="טוען…">
            <div className="h-40 w-full animate-pulse rounded-lg border border-border-subtle bg-surface" />
          </Section>
        ) : familiesError ? (
          <EmptyState title="משהו השתבש" description={familiesError} />
        ) : families.length === 0 ? (
          <Section
            title="עדיין אין לכם משפחה"
            description="התחילו משפחה חדשה כדי להציע ולהצביע על שמות ביחד, או הצטרפו עם קוד הזמנה שקיבלתם."
          >
            <FamilySwitcher
              families={families}
              activeFamilyId={activeFamilyId}
              onSelect={setActiveFamilyId}
              onCreate={async (name) => { await handleCreateFamily(name) }}
              onJoin={handleJoinFamily}
            />
          </Section>
        ) : (
          <>
            <Section title="המשפחה הפעילה">
              <FamilySwitcher
                families={families}
                activeFamilyId={activeFamilyId}
                onSelect={setActiveFamilyId}
                onCreate={async (name) => { await handleCreateFamily(name) }}
                onJoin={handleJoinFamily}
              />
            </Section>

            {view === "family" && activeFamily ? (
              <MyFamilyScreen family={activeFamily} currentUserId={session.user.id} onRenamed={reloadFamilies} />
            ) : (
              <>
                {view === "browse" ? (
                  <>
                    <Section
                      title="הציעו שם למשפחה"
                      description="השם יופיע רק אצל בני המשפחה שלכם, ואפשר להצביע עליו כמו על כל שם אחר."
                    >
                      <SuggestNameForm onSubmit={handleSuggestName} />
                    </Section>

                    {activeFamilyId && userId ? (
                      <RecommendedNames familyId={activeFamilyId} userId={userId} refreshKey={votes.size} />
                    ) : null}
                  </>
                ) : null}

                <Section
                  title={view === "ranking" ? "הדירוג של המשפחה" : "כל השמות"}
                  description={
                    view === "ranking"
                      ? "מדורג לפי מספר המצביעים השונים, ובשוויון — לפי ההצבעה האחרונה."
                      : "הקטלוג המשותף, יחד עם השמות שהמשפחה שלכם הציעה."
                  }
                >
                  <div className="flex flex-col gap-4">
                    {view === "browse" ? <NameFiltersBar value={filters} onChange={setFilters} /> : null}

                    {!namesLoading && !namesError ? (
                      <p className="text-body-sm text-content-muted">{names.length} שמות נמצאו</p>
                    ) : null}

                    <NameGrid
                      names={names}
                      votes={votes}
                      view={gridView}
                      loading={namesLoading}
                      error={namesError}
                      searchQuery={searchQuery}
                      onToggleVote={toggleVote}
                    />
                  </div>
                </Section>
              </>
            )}
          </>
        )}
      </DashboardLayout>

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
          חשבון האורח קיים רק בדפדפן הזה. אם תצאו, לא נוכל לשחזר אותו — והמשפחות,
          השמות וההצבעות שלכם לא יהיו נגישים יותר.
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
            ? "המשפחות וההצבעות שלך איתך גם בפעם הבאה."
            : linkResult?.outcome === "conflict"
              ? "חשבון Google הזה כבר משויך למשתמש אחר. התחברו איתו ישירות, או נסו חשבון Google אחר. הנתונים שלכם כאן לא נפגעו."
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
