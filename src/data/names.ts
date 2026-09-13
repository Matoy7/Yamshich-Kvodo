import { supabase } from "@/lib/supabase"

export const NAME_MAX_LENGTH = 60

export type Gender = "boy" | "girl" | "unisex"
export type Origin = "biblical" | "hebrew" | "israeli" | "international" | "arabic" | "european" | "greek"
export type Meaning = "love" | "nature" | "light" | "strength" | "joy" | "freedom"
export type Style = "classic" | "modern" | "unique" | "soft" | "traditional" | "vintage"
export type Popularity = "popular" | "less_common" | "rare" | "very_rare"
export type MeaningConfidence = "verified" | "uncertain"

export type NameEntry = {
  id: string
  text: string
  gender: Gender | null
  /** Free text, e.g. "Biblical;Hebrew" — for display. Filtering uses the boolean flags below, not this string. */
  origin: string | null
  origins: Origin[]
  meanings: Meaning[]
  styles: Style[]
  popularity: Popularity | null
  length: number | null
  short: boolean
  easyInEnglish: boolean
  worksInternationally: boolean
  startsWith: string | null
  endsWith: string | null
  /** The actual Hebrew meaning, as curated — never AI-generated, never translated or reworded. */
  meaningHe: string | null
  meaningSource: string | null
  meaningConfidence: MeaningConfidence | null
  /** null = shared catalogue entry; set = this family's own suggestion. */
  familyId: string | null
  suggestedBy: string | null
  createdAt: string
}

type NameRow = {
  id: string
  text: string
  gender: Gender | null
  origin: string | null
  family_id: string | null
  suggested_by: string | null
  created_at: string
  popularity: Popularity | null
  length: number | null
  short: boolean
  easy_in_english: boolean
  works_internationally: boolean
  starts_with: string | null
  ends_with: string | null
  biblical: boolean
  hebrew: boolean
  israeli: boolean
  international: boolean
  arabic: boolean
  european: boolean
  greek: boolean
  meaning_love: boolean
  meaning_nature: boolean
  meaning_light: boolean
  meaning_strength: boolean
  meaning_joy: boolean
  meaning_freedom: boolean
  style_classic: boolean
  style_modern: boolean
  style_unique: boolean
  style_soft: boolean
  style_traditional: boolean
  style_vintage: boolean
  meaning_he: string | null
  meaning_source: string | null
  meaning_confidence: MeaningConfidence | null
}

const SELECT_COLUMNS = `id, text, gender, origin, family_id, suggested_by, created_at, popularity, length, short,
  easy_in_english, works_internationally, starts_with, ends_with,
  biblical, hebrew, israeli, international, arabic, european, greek,
  meaning_love, meaning_nature, meaning_light, meaning_strength, meaning_joy, meaning_freedom,
  style_classic, style_modern, style_unique, style_soft, style_traditional, style_vintage,
  meaning_he, meaning_source, meaning_confidence`

const ORIGIN_FLAGS: Origin[] = ["biblical", "hebrew", "israeli", "international", "arabic", "european", "greek"]
const MEANING_FLAGS: Meaning[] = ["love", "nature", "light", "strength", "joy", "freedom"]
const STYLE_FLAGS: Style[] = ["classic", "modern", "unique", "soft", "traditional", "vintage"]

function fromRow(row: NameRow): NameEntry {
  return {
    id: row.id,
    text: row.text,
    gender: row.gender,
    origin: row.origin,
    origins: ORIGIN_FLAGS.filter((o) => row[o]),
    meanings: MEANING_FLAGS.filter((m) => row[`meaning_${m}` as keyof NameRow]),
    styles: STYLE_FLAGS.filter((s) => row[`style_${s}` as keyof NameRow]),
    popularity: row.popularity,
    length: row.length,
    short: row.short,
    easyInEnglish: row.easy_in_english,
    worksInternationally: row.works_internationally,
    startsWith: row.starts_with,
    endsWith: row.ends_with,
    meaningHe: row.meaning_he,
    meaningSource: row.meaning_source,
    meaningConfidence: row.meaning_confidence,
    familyId: row.family_id,
    suggestedBy: row.suggested_by,
    createdAt: row.created_at,
  }
}

export type NameFilters = {
  /** Single-select — "who the name is for" is one choice, not several. */
  gender?: Gender
  /** Each array is OR'd within itself; every non-empty filter (including across categories) is AND'd with the rest. */
  origins?: Origin[]
  meanings?: Meaning[]
  styles?: Style[]
  popularities?: Popularity[]
  initial?: string
  endsWith?: string
  short?: boolean
  easyInEnglish?: boolean
  worksInternationally?: boolean
  search?: string
  /** "alphabetical" (default) or "popularity" — kept separate from the filter fields, per the sort/filter UI split. */
  sort?: "alphabetical" | "popularity"
}

/**
 * The catalogue plus a family's own suggestions in one call: RLS already
 * scopes suggestions to families the caller belongs to, so `family_id is
 * null or family_id = eq(familyId)` reads exactly what the family is
 * allowed to see — nothing is filtered client-side that the server would
 * not also have allowed.
 *
 * Each `.or()` call below adds one more `or=(...)` query parameter to the
 * PostgREST request; independent `or=` parameters are ANDed together by
 * PostgREST, while the conditions listed inside a single call are ORed —
 * so calling `.or()` once per category (Origin, Meaning, Style) is exactly
 * "Girls AND (Biblical OR Hebrew) AND (Nature)", not one giant OR of
 * everything selected.
 */
/**
 * familyId is optional: signed out of any family, a user still sees the
 * shared catalogue (family_id is null) — that's allowed by the same RLS
 * policy that lets any signed-in member read it. Only a family's own
 * private suggestions require actually belonging to that family, so those
 * simply don't appear until familyId is set.
 */
export async function fetchNames(familyId: string | null, filters: NameFilters = {}): Promise<NameEntry[]> {
  let query = supabase.from("names").select(SELECT_COLUMNS)

  query = familyId ? query.or(`family_id.is.null,family_id.eq.${familyId}`) : query.is("family_id", null)

  if (filters.gender) query = query.eq("gender", filters.gender)

  if (filters.origins?.length) {
    query = query.or(filters.origins.map((o) => `${o}.eq.true`).join(","))
  }
  if (filters.meanings?.length) {
    query = query.or(filters.meanings.map((m) => `meaning_${m}.eq.true`).join(","))
  }
  if (filters.styles?.length) {
    query = query.or(filters.styles.map((s) => `style_${s}.eq.true`).join(","))
  }
  if (filters.popularities?.length) query = query.in("popularity", filters.popularities)

  if (filters.initial) query = query.eq("starts_with", filters.initial)
  if (filters.endsWith) query = query.eq("ends_with", filters.endsWith)
  if (filters.short) query = query.eq("short", true)
  if (filters.easyInEnglish) query = query.eq("easy_in_english", true)
  if (filters.worksInternationally) query = query.eq("works_internationally", true)
  if (filters.search) query = query.ilike("text", `%${filters.search}%`)

  const ordered =
    filters.sort === "popularity"
      ? query.order("popularity_score", { ascending: false, nullsFirst: false }).order("text", { ascending: true })
      : query.order("text", { ascending: true })

  const { data, error } = await ordered
  if (error) throw error
  return (data as NameRow[]).map(fromRow)
}

/** Suggests a new name, private to one family. */
export async function suggestName(
  familyId: string,
  text: string,
  gender: Gender | null,
  origin: string | null,
  suggestedBy: string,
): Promise<NameEntry> {
  const { data, error } = await supabase
    .from("names")
    .insert({ family_id: familyId, text: text.trim(), gender, origin, suggested_by: suggestedBy })
    .select(SELECT_COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as NameRow)
}

export async function deleteSuggestion(nameId: string): Promise<void> {
  const { error } = await supabase.from("names").delete().eq("id", nameId)
  if (error) throw error
}

/**
 * "Based on what your family already voted for": looks at the gender(s) of
 * names the family has voted for, then suggests other shared-catalogue
 * names of the same gender(s) they haven't voted for yet. Deliberately
 * simple and explainable — no black-box scoring, nothing invented, just
 * "more of what you already leaned toward."
 */
export async function fetchRecommendations(familyId: string, limit = 6): Promise<NameEntry[]> {
  const { data: votedRows, error: votedErr } = await supabase
    .from("name_votes")
    .select("name_id")
    .eq("family_id", familyId)
  if (votedErr) throw votedErr

  const votedIds = [...new Set((votedRows as { name_id: string }[]).map((r) => r.name_id))]
  if (votedIds.length === 0) return []

  const { data: votedNames, error: namesErr } = await supabase
    .from("names")
    .select("id, gender")
    .in("id", votedIds)
  if (namesErr) throw namesErr

  const genders = [
    ...new Set((votedNames as { id: string; gender: Gender | null }[]).map((n) => n.gender).filter(Boolean)),
  ] as Gender[]
  if (genders.length === 0) return []

  const { data, error } = await supabase
    .from("names")
    .select(SELECT_COLUMNS)
    .is("family_id", null)
    .in("gender", genders)
    .not("id", "in", `(${votedIds.join(",")})`)
    .limit(limit)
  if (error) throw error
  return (data as NameRow[]).map(fromRow)
}

export type RankedName = {
  nameId: string
  text: string
  gender: Gender | null
  origin: string | null
  suggestedForFamilyId: string | null
  voteCount: number
  lastVotedAt: string
  meaningHe: string | null
  meaningConfidence: MeaningConfidence | null
}

type RankingRow = {
  name_id: string
  text: string
  gender: Gender | null
  origin: string | null
  suggested_for_family_id: string | null
  vote_count: number
  last_voted_at: string
  meaning_he: string | null
  meaning_confidence: MeaningConfidence | null
}

/**
 * A family's ranking, straight from family_name_rankings: distinct-voter
 * count first, most-recently-voted as the tiebreaker — computed in Postgres
 * so the client never has to derive an order from raw vote rows itself.
 */
export async function fetchFamilyRanking(familyId: string): Promise<RankedName[]> {
  const { data, error } = await supabase
    .from("family_name_rankings")
    .select("name_id, text, gender, origin, suggested_for_family_id, vote_count, last_voted_at, meaning_he, meaning_confidence")
    .eq("family_id", familyId)
    .order("vote_count", { ascending: false })
    .order("last_voted_at", { ascending: false })
  if (error) throw error
  return (data as RankingRow[]).map((r) => ({
    nameId: r.name_id,
    text: r.text,
    gender: r.gender,
    origin: r.origin,
    suggestedForFamilyId: r.suggested_for_family_id,
    voteCount: r.vote_count,
    lastVotedAt: r.last_voted_at,
    meaningHe: r.meaning_he,
    meaningConfidence: r.meaning_confidence,
  }))
}
