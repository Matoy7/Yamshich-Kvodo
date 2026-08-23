/**
 * Minimal class-name composer. Later values win only in source order — the
 * design system relies on variant maps rather than override-by-specificity,
 * so a full merge implementation is intentionally not needed here.
 */
export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ")
}
