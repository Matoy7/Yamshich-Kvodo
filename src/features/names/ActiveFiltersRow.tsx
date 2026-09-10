import type { NameFiltersValue } from "./NameFiltersBar"
import { EMPTY_NAME_FILTERS } from "./NameFiltersBar"
import { GENDER_LABELS, ORIGIN_OPTIONS, MEANING_OPTIONS, STYLE_OPTIONS, POPULARITY_OPTIONS, MORE_FILTER_LABELS } from "./filterOptions"

type ChipData = { key: string; label: string; onRemove: () => void }

function Chip({ chip }: { chip: ChipData }) {
  return (
    <span className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-surface-muted ps-1 pe-2.5 text-caption font-medium text-content-primary">
      <button
        type="button"
        onClick={chip.onRemove}
        aria-label={`הסרת הסינון ${chip.label}`}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-content-muted transition-colors duration-150 hover:bg-surface-hover hover:text-content-primary"
      >
        <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span>{chip.label}</span>
    </span>
  )
}

type ActiveFiltersRowProps = {
  value: NameFiltersValue
  onChange: (value: NameFiltersValue) => void
}

/**
 * Deliberately separate from the main filter bar: those pills are "what can
 * I choose", this row is "what did I choose" — collapsing them into one
 * would put the two questions back into the same visual weight the redesign
 * is meant to fix. Renders nothing when no filter is active, rather than an
 * empty "Active filters:" label with nothing under it.
 */
export function ActiveFiltersRow({ value, onChange }: ActiveFiltersRowProps) {
  const chips: ChipData[] = []

  if (value.gender) {
    chips.push({
      key: "gender",
      label: GENDER_LABELS[value.gender],
      onRemove: () => onChange({ ...value, gender: undefined }),
    })
  }

  for (const opt of ORIGIN_OPTIONS) {
    if (value.origins.includes(opt.value)) {
      chips.push({
        key: `origin-${opt.value}`,
        label: opt.label,
        onRemove: () => onChange({ ...value, origins: value.origins.filter((v) => v !== opt.value) }),
      })
    }
  }
  for (const opt of MEANING_OPTIONS) {
    if (value.meanings.includes(opt.value)) {
      chips.push({
        key: `meaning-${opt.value}`,
        label: opt.label,
        onRemove: () => onChange({ ...value, meanings: value.meanings.filter((v) => v !== opt.value) }),
      })
    }
  }
  for (const opt of STYLE_OPTIONS) {
    if (value.styles.includes(opt.value)) {
      chips.push({
        key: `style-${opt.value}`,
        label: opt.label,
        onRemove: () => onChange({ ...value, styles: value.styles.filter((v) => v !== opt.value) }),
      })
    }
  }
  for (const opt of POPULARITY_OPTIONS) {
    if (value.popularities.includes(opt.value)) {
      chips.push({
        key: `popularity-${opt.value}`,
        label: opt.label,
        onRemove: () => onChange({ ...value, popularities: value.popularities.filter((v) => v !== opt.value) }),
      })
    }
  }

  for (const key of ["short", "easyInEnglish", "worksInternationally"] as const) {
    if (value.more[key]) {
      chips.push({
        key: `more-${key}`,
        label: MORE_FILTER_LABELS[key],
        onRemove: () => onChange({ ...value, more: { ...value.more, [key]: false } }),
      })
    }
  }
  if (value.more.initial) {
    chips.push({
      key: "more-initial",
      label: `מתחיל ב-${value.more.initial}`,
      onRemove: () => onChange({ ...value, more: { ...value.more, initial: undefined } }),
    })
  }
  if (value.more.endsWith) {
    chips.push({
      key: "more-endsWith",
      label: `מסתיים ב-${value.more.endsWith}`,
      onRemove: () => onChange({ ...value, more: { ...value.more, endsWith: undefined } }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-caption font-medium text-content-muted">סינון פעיל:</span>
      {chips.map((chip) => (
        <Chip key={chip.key} chip={chip} />
      ))}
      <button
        type="button"
        onClick={() => onChange(EMPTY_NAME_FILTERS)}
        className="ms-1 text-caption font-medium text-accent hover:underline"
      >
        ניקוי הכל
      </button>
    </div>
  )
}
