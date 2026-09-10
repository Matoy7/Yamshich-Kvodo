import type { Gender, Origin, Meaning, Style, Popularity } from "@/data/names"

export const GENDER_LABELS: Record<Gender, string> = {
  boy: "בנים",
  girl: "בנות",
  unisex: "יוניסקס",
}

export const ORIGIN_OPTIONS: { value: Origin; label: string }[] = [
  { value: "biblical", label: "מקראי" },
  { value: "hebrew", label: "עברי" },
  { value: "israeli", label: "ישראלי" },
  { value: "international", label: "בינלאומי" },
  { value: "arabic", label: "ערבי" },
  { value: "european", label: "אירופאי" },
  { value: "greek", label: "יווני" },
]

export const MEANING_OPTIONS: { value: Meaning; label: string }[] = [
  { value: "love", label: "אהבה" },
  { value: "nature", label: "טבע" },
  { value: "light", label: "אור" },
  { value: "strength", label: "עוצמה" },
  { value: "joy", label: "שמחה" },
  { value: "freedom", label: "חופש" },
]

export const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "classic", label: "קלאסי" },
  { value: "modern", label: "מודרני" },
  { value: "unique", label: "ייחודי" },
  { value: "soft", label: "רך" },
  { value: "traditional", label: "מסורתי" },
  { value: "vintage", label: "וינטג'" },
]

export const POPULARITY_OPTIONS: { value: Popularity; label: string }[] = [
  { value: "popular", label: "פופולרי" },
  { value: "less_common", label: "פחות נפוץ" },
  { value: "rare", label: "נדיר" },
  { value: "very_rare", label: "נדיר מאוד" },
]

export const MORE_FILTER_LABELS = {
  short: "קצר",
  easyInEnglish: "קל להגייה באנגלית",
  worksInternationally: "עובד גם בינלאומית",
} as const
