import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Section } from '@/components/layout/Section'
import { HeroBanner } from '@/features/home/HeroBanner'
import { SentenceGrid } from '@/features/home/SentenceGrid'
import { navItems } from '@/data/navigation'
import { sentences } from '@/data/sentences'

const PRODUCT_NAME = 'ימשיך כבודו'
const TAGLINE = 'שני אנשים. משפט אחד.'

export default function App() {
  return (
    <DashboardLayout
      productName={PRODUCT_NAME}
      tagline={TAGLINE}
      navItems={navItems}
      activeNavId="home"
      pageTitle="בית"
      hasNotifications
    >
      <HeroBanner
        title={PRODUCT_NAME}
        subtitle={TAGLINE}
        ctaLabel="התחל משפט"
        composerPlaceholder="כתבו את תחילת המשפט…"
      />

      <Section>
        <SentenceGrid sentences={sentences} />
      </Section>
    </DashboardLayout>
  )
}
