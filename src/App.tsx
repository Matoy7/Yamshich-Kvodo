import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Section } from '@/components/layout/Section'
import { HeroBanner } from '@/features/home/HeroBanner'
import { SentenceGrid } from '@/features/home/SentenceGrid'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { navItems } from '@/data/navigation'
import { sentences } from '@/data/sentences'

const PRODUCT_NAME = 'ימשיך כבודו'
const TAGLINE = 'שני אנשים. משפט אחד.'
const PRIVACY_NOTE = 'הפרטים שלך נשארים אצלנו ולא יפורסמו.'
const COMPOSER_PLACEHOLDER =
  'כאן שמים את תחילת המשפט. לא צריך שלוש נקודות אנחנו נשלים אותם עבורכם. (לדוגמה "בא לי לאכול היום")'

export default function App() {
  // UI-only gate: no authentication is performed and no credentials are
  // handled. Set the initial value to `true` to open straight on the dashboard.
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) {
    return (
      <LoginScreen
        brandName={PRODUCT_NAME}
        brandTagline={TAGLINE}
        privacyNote={PRIVACY_NOTE}
        onContinue={() => setSignedIn(true)}
      />
    )
  }

  return (
    <DashboardLayout
      brandName={PRODUCT_NAME}
      brandTagline={TAGLINE}
      navItems={navItems}
      activeNavId="home"
      searchPlaceholder="חיפוש"
      hasNotifications
    >
      <HeroBanner
        label="התחלת משפט חדש"
        ctaLabel="התחל משפט"
        composerPlaceholder={COMPOSER_PLACEHOLDER}
      />

      <Section>
        <SentenceGrid sentences={sentences} />
      </Section>
    </DashboardLayout>
  )
}
