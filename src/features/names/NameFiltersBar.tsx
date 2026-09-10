import { cn } from "@/lib/cn"
import { MultiFilterDropdown } from "./MultiFilterDropdown"
import { MoreFiltersDropdown, type MoreFilters } from "./MoreFiltersDropdown"
import { ORIGIN_OPTIONS, MEANING_OPTIONS, STYLE_OPTIONS, POPULARITY_OPTIONS } from "./filterOptions"
import type { Gender, Origin, Meaning, Style, Popularity } from "@/data/names"

const GENDER_TABS: { value: Gender | undefined; label: string }[] = [
  { value: undefined, label: "כל השמות" },
  { value: "boy", label: "בנים" },
  { value: "girl", label: "בנות" },
  { value: "unisex", label: "יוניסקס" },
]

export type NameFiltersValue = {
  gender: Gender | undefined
  origins: Origin[]
  meanings: Meaning[]
  styles: Style[]
  popularities: Popularity[]
  more: MoreFilters
}

export const EMPTY_NAME_FILTERS: NameFiltersValue = {
  gender: undefined,
  origins: [],
  meanings: [],
  styles: [],
  popularities: [],
  more: { short: false, easyInEnglish: false, worksInternationally: false, initial: undefined, endsWith: undefined },
}

type NameFiltersBarProps = {
  value: NameFiltersValue
  onChange: (value: NameFiltersValue) => void
}

/**
 * Two visibly different kinds of control, on purpose:
 *
 * "Who it's for" is a segmented control — one shared pill-shaped track,
 * the active choice filled solid. Segmented controls read as "pick exactly
 * one of these" at a glance, which is exactly what gender is here.
 *
 * "What characteristics" (Origin/Meaning/Style/Popularity) are dropdown
 * pills with a chevron — each opens a checklist, because more than one can
 * be true at once. They never fill solid when active; a small count badge
 * is the only in-bar signal, since the real "what's active" answer lives in
 * the chip row below, not in this bar.
 */
export function NameFiltersBar({ value, onChange }: NameFiltersBarProps) {
  const set = <K extends keyof NameFiltersValue>(key: K, next: NameFiltersValue[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        role="radiogroup"
        aria-label="למי מיועד השם"
        className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-hover p-1"
      >
        {GENDER_TABS.map((tab) => {
          const active = value.gender === tab.value
          return (
            <button
              key={tab.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set("gender", tab.value)}
              className={cn(
                "h-7 shrink-0 rounded-full px-3 text-body-sm font-medium transition-colors duration-150",
                active ? "bg-surface text-content-primary shadow-panel" : "text-content-secondary hover:text-content-primary",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:block" />

      <div className="flex flex-wrap items-center gap-1.5">
        <MultiFilterDropdown label="מקור" options={ORIGIN_OPTIONS} values={value.origins} onChange={(v) => set("origins", v)} />
        <MultiFilterDropdown
          label="משמעות"
          options={MEANING_OPTIONS}
          values={value.meanings}
          onChange={(v) => set("meanings", v)}
        />
        <MultiFilterDropdown label="סגנון" options={STYLE_OPTIONS} values={value.styles} onChange={(v) => set("styles", v)} />
        <MultiFilterDropdown
          label="פופולריות"
          options={POPULARITY_OPTIONS}
          values={value.popularities}
          onChange={(v) => set("popularities", v)}
        />
        <MoreFiltersDropdown value={value.more} onChange={(v) => set("more", v)} />
      </div>
    </div>
  )
}
