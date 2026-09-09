import { cn } from "@/lib/cn"
import type { Gender } from "@/data/names"

const HEBREW_ALPHABET = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ",
  "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
]

const GENDER_CHIPS: { value: Gender | undefined; label: string }[] = [
  { value: undefined, label: "הכל" },
  { value: "boy", label: "לבן" },
  { value: "girl", label: "לבת" },
  { value: "unisex", label: "יוניסקס" },
]

type NameFiltersBarProps = {
  gender: Gender | undefined
  initial: string | undefined
  onChangeGender: (gender: Gender | undefined) => void
  onChangeInitial: (initial: string | undefined) => void
}

function chipClass(active: boolean): string {
  return cn(
    "h-8 shrink-0 rounded-full border px-3 text-body-sm font-medium transition-colors duration-150",
    active
      ? "border-border-strong bg-surface-muted text-content-primary"
      : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
  )
}

export function NameFiltersBar({ gender, initial, onChangeGender, onChangeInitial }: NameFiltersBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {GENDER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onChangeGender(chip.value)}
            className={chipClass(gender === chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="אות ראשונה">
        <button
          type="button"
          onClick={() => onChangeInitial(undefined)}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border text-body-sm font-medium transition-colors duration-150",
            !initial
              ? "border-border-strong bg-surface-muted text-content-primary"
              : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
          )}
          aria-label="כל האותיות"
        >
          #
        </button>
        {HEBREW_ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => onChangeInitial(letter === initial ? undefined : letter)}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border text-body-sm font-medium transition-colors duration-150",
              initial === letter
                ? "border-border-strong bg-surface-muted text-content-primary"
                : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
            )}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  )
}
