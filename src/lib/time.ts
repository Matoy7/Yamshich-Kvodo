/** Hebrew relative timestamps: "לפני 3 שעות", "אתמול". */
const FORMATTER = new Intl.RelativeTimeFormat("he", { numeric: "auto" })

/** Named rather than inlined: the formatter mangles nested readonly tuples. */
type UnitStep = readonly [Intl.RelativeTimeFormatUnit, number]

const UNITS: readonly UnitStep[] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
] as const

export function relativeTime(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size)
      return FORMATTER.format(Math.round(seconds / size), unit)
  }
  return FORMATTER.format(Math.round(seconds), "second")
}
