/**
 * Friendly Hebrew display names for guests.
 *
 * A name is a Cartesian pick of animal × trait × colour × object:
 *
 *   שועל סקרן כחול עם מטרייה
 *
 * Hebrew adjectives agree in gender with the noun they describe, so every
 * animal carries its gender and every trait and colour carries both forms.
 * Picking blindly would produce "קפיברה סקרן", which reads as broken Hebrew —
 * the agreed form is "קפיברה סקרנית". Colours that are really nouns
 * (זהב, תכלת, מנטה …) never inflect.
 */

type Gender = "m" | "f"

/** Masculine and feminine forms of one word. */
type Inflected = readonly [masculine: string, feminine: string]

/** Named rather than inlined: the formatter mangles nested readonly tuples. */
type AnimalEntry = readonly [name: string, gender: Gender]

const ANIMALS: readonly AnimalEntry[] = [
  ["שועל", "m"],
  ["חתול", "m"],
  ["כלב", "m"],
  ["דביבון", "m"],
  ["ברווז", "m"],
  ["ינשוף", "m"],
  ["פינגווין", "m"],
  ["קואלה", "f"],
  ["פנדה", "f"],
  ["קפיברה", "f"],
  ["ארנב", "m"],
  ["קוף", "m"],
  ["לוטרה", "f"],
  ["נשר", "m"],
  ["פלמינגו", "m"],
  ["ג'ירפה", "f"],
  ["פיל", "m"],
  ["זברה", "f"],
  ["טווס", "m"],
  ["כריש", "m"],
  ["לוויתן", "m"],
  ["תמנון", "m"],
  ["צב", "m"],
  ["דולפין", "m"],
  ["למור", "m"],
] as const

const TRAITS: readonly Inflected[] = [
  ["סקרן", "סקרנית"],
  ["שובב", "שובבה"],
  ["מסתורי", "מסתורית"],
  ["נועז", "נועזת"],
  ["רגוע", "רגועה"],
  ["זריז", "זריזה"],
  ["שנון", "שנונה"],
  ["חייכן", "חייכנית"],
  ["עקשן", "עקשנית"],
  ["מנומס", "מנומסת"],
  ["מבולבל", "מבולבלת"],
  ["דרמטי", "דרמטית"],
  ["ספונטני", "ספונטנית"],
  ["יצירתי", "יצירתית"],
  ["חולם", "חולמת"],
  ["הרפתקן", "הרפתקנית"],
  ["פיקח", "פיקחית"],
  ["עצלן", "עצלנית"],
  ["אופטימי", "אופטימית"],
  ["ציני", "צינית"],
  ["שקט", "שקטה"],
  ["אנרגטי", "אנרגטית"],
  ["קלאסי", "קלאסית"],
  ["מוזר", "מוזרה"],
  ["אגדי", "אגדית"],
] as const

/** Nouns such as זהב and תכלת keep one form for both genders. */
const COLOURS: readonly Inflected[] = [
  ["כחול", "כחולה"],
  ["תכלת", "תכלת"],
  ["סגול", "סגולה"],
  ["ורוד", "ורודה"],
  ["אדום", "אדומה"],
  ["כתום", "כתומה"],
  ["צהוב", "צהובה"],
  ["ירוק", "ירוקה"],
  ["טורקיז", "טורקיז"],
  ["זהב", "זהב"],
  ["כסף", "כסף"],
  ["לבן", "לבנה"],
  ["שחור", "שחורה"],
  ["אפור", "אפורה"],
  ["בורדו", "בורדו"],
  ["לילך", "לילך"],
  ["מנטה", "מנטה"],
  ["קורל", "קורל"],
  ["אינדיגו", "אינדיגו"],
  ["מג'נטה", "מג'נטה"],
] as const

const OBJECTS: readonly string[] = [
  "מטרייה",
  "כובע",
  "משקפיים",
  "מזוודה",
  "מצפן",
  "פנס",
  "שעון",
  "מצלמה",
  "בלון",
  "עפיפון",
  "מטרונום",
  "מיקרופון",
  "גיטרה",
  "פסנתר",
  "טוסטר",
  "קומקום",
  "ספל",
  "כפית",
  "מזלג",
  "כרית",
  "גרב",
  "נעלי בית",
  "סקייטבורד",
  "אופניים",
  "רדיו",
  "טלסקופ",
  "מגפון",
  "פנקס",
  "משרוקית",
] as const

/** 25 × 25 × 20 × 29 — the size of the name space. */
export const GUEST_NAME_COMBINATIONS =
  ANIMALS.length * TRAITS.length * COLOURS.length * OBJECTS.length

/** Uniform random index, using the crypto RNG when the browser offers one. */
function randomIndex(length: number): number {
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1)
    // Reject the tail of the range so every index stays equally likely.
    const limit = Math.floor(0xffffffff / length) * length
    let value = 0
    do {
      cryptoApi.getRandomValues(buffer)
      value = buffer[0]
    } while (value >= limit)
    return value % length
  }
  return Math.floor(Math.random() * length)
}

function pick<T>(items: readonly T[]): T {
  return items[randomIndex(items.length)]
}

/**
 * Builds one guest name, e.g. "קפיברה נועזת זהב עם טלסקופ".
 * The object clause is always included so the full name space is available.
 */
export function generateGuestName(): string {
  const [animal, gender] = pick(ANIMALS)
  const form = gender === "f" ? 1 : 0

  const trait = pick(TRAITS)[form]
  const colour = pick(COLOURS)[form]
  const object = pick(OBJECTS)

  return `${animal} ${trait} ${colour} עם ${object}`
}
