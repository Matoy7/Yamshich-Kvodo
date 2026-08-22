import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Section } from '@/components/layout/Section'
import { HeroBanner } from '@/features/home/HeroBanner'
import { SentenceGrid } from '@/features/home/SentenceGrid'
import { navItems } from '@/data/navigation'
import { sentences } from '@/data/sentences'

const PRODUCT_NAME = 'ימשיך כבודו'
const TAGLINE = 'שני אנשים. משפט אחד.'
const COMPOSER_PLACEHOLDER =
  'כאן שמים את תחילת המשפט. לא צריך שלוש נקודות אנחנו נשלים אותם עבורכם. (לדוגמה "בא לי לאכול היום")'

export default function App() {
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
