import { cn } from "@/lib/cn"
import { FilterDropdown } from "./FilterDropdown"
import { MoreFiltersDropdown, type MoreFilters } from "./MoreFiltersDropdown"
import type { Gender, Origin, Meaning, Style, Popularity } from "@/data/names"

const GENDER_TABS: { value: Gender | undefined; label: string; tint: string }[] = [
  { value: undefined, label: "כל השמות", tint: "all" },
  { value: "boy", label: "בנים", tint: "boy" },
  { value: "girl", label: "בנות", tint: "girl" },
  { value: "unisex", label: "יוניסקס", tint: "unisex" },
]

// Soft, pastel per-gender tints — deliberately scoped to this one row rather
// than added to the shared token file, since nothing else in the product
// needs a blue/pink/purple scale.
const TINTS: Record<string, { active: string; idle: string }> = {
  all: {
    active: "border-danger/30 bg-danger/10 text-danger",
    idle: "border-border bg-surface text-content-secondary hover:bg-surface-hover",
  },
  boy: {
    active: "border-[#b9cdfb] bg-[#eaf1ff] text-[#3054c4]",
    idle: "border-border bg-surface text-content-secondary hover:bg-surface-hover",
  },
  girl: {
    active: "border-[#f7c3da] bg-[#fdeef4] text-[#c23477]",
    idle: "border-border bg-surface text-content-secondary hover:bg-surface-hover",
  },
  unisex: {
    active: "border-border-strong bg-surface-muted text-accent",
    idle: "border-border bg-surface text-content-secondary hover:bg-surface-hover",
  },
}

const ORIGIN_OPTIONS: { value: Origin; label: string }[] = [
  { value: "biblical", label: "מקראי" },
  { value: "hebrew", label: "עברי" },
  { value: "israeli", label: "ישראלי" },
  { value: "international", label: "בינלאומי" },
  { value: "arabic", label: "ערבי" },
  { value: "european", label: "אירופאי" },
]

const MEANING_OPTIONS: { value: Meaning; label: string }[] = [
  { value: "love", label: "אהבה" },
  { value: "nature", label: "טבע" },
  { value: "light", label: "אור" },
  { value: "strength", label: "עוצמה" },
  { value: "joy", label: "שמחה" },
  { value: "freedom", label: "חופש" },
]

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "classic", label: "קלאסי" },
  { value: "modern", label: "מודרני" },
  { value: "unique", label: "ייחודי" },
  { value: "soft", label: "רך" },
  { value: "traditional", label: "מסורתי" },
  { value: "vintage", label: "וינטג'" },
]

const POPULARITY_OPTIONS: { value: Popularity; label: string }[] = [
  { value: "popular", label: "פופולרי" },
  { value: "less_common", label: "פחות נפוץ" },
  { value: "rare", label: "נדיר" },
  { value: "very_rare", label: "נדיר מאוד" },
]

export type NameFiltersValue = {
  gender: Gender | undefined
  origin: Origin | undefined
  meaning: Meaning | undefined
  style: Style | undefined
  popularity: Popularity | undefined
  more: MoreFilters
}

type NameFiltersBarProps = {
  value: NameFiltersValue
  onChange: (value: NameFiltersValue) => void
}

/**
 * Two visual groups in one row, in the order a parent actually thinks in:
 * who the name is for (the four gender tabs — soft-tinted, always visible,
 * no dropdown needed since there are only four and picking one is the very
 * first decision), then what characteristics matter (Origin / Meaning /
 * Style / Popularity, each a small dropdown so six-to-eight options don't
 * have to sit on screen at once), with "More Filters" last as the
 * deliberate overflow for anything more specific.
 */
export function NameFiltersBar({ value, onChange }: NameFiltersBarProps) {
  const set = <K extends keyof NameFiltersValue>(key: K, next: NameFiltersValue[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="למי מיועד השם">
        {GENDER_TABS.map((tab) => {
          const active = value.gender === tab.value
          const tint = TINTS[tab.tint]
          return (
            <button
              key={tab.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set("gender", tab.value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-body-sm font-medium transition-colors duration-150",
                active ? tint.active : tint.idle,
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" />

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterDropdown label="מקור" options={ORIGIN_OPTIONS} value={value.origin} onChange={(v) => set("origin", v)} />
        <FilterDropdown label="משמעות" options={MEANING_OPTIONS} value={value.meaning} onChange={(v) => set("meaning", v)} />
        <FilterDropdown label="סגנון" options={STYLE_OPTIONS} value={value.style} onChange={(v) => set("style", v)} />
        <FilterDropdown
          label="פופולריות"
          options={POPULARITY_OPTIONS}
          value={value.popularity}
          onChange={(v) => set("popularity", v)}
        />
        <MoreFiltersDropdown value={value.more} onChange={(v) => set("more", v)} />
      </div>
    </div>
  )
}
