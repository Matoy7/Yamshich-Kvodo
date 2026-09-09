import { supabase } from "@/lib/supabase"

export const NAME_MAX_LENGTH = 60

export type Gender = "boy" | "girl" | "unisex"

export type NameEntry = {
  id: string
  text: string
  gender: Gender | null
  origin: string | null
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
}

function fromRow(row: NameRow): NameEntry {
  return {
    id: row.id,
    text: row.text,
    gender: row.gender,
    origin: row.origin,
    familyId: row.family_id,
    suggestedBy: row.suggested_by,
    createdAt: row.created_at,
  }
}

export type NameFilters = {
  gender?: Gender
  initial?: string
  search?: string
}

/**
 * The catalogue plus a family's own suggestions in one call: RLS already
 * scopes suggestions to families the caller belongs to, so `family_id is
 * null or family_id = eq(familyId)` reads exactly what the family is
 * allowed to see — nothing is filtered client-side that the server would
 * not also have allowed.
 */
export async function fetchNames(familyId: string, filters: NameFilters = {}): Promise<NameEntry[]> {
  let query = supabase
    .from("names")
    .select("id, text, gender, origin, family_id, suggested_by, created_at")
    .or(`family_id.is.null,family_id.eq.${familyId}`)

  if (filters.gender) query = query.eq("gender", filters.gender)
  if (filters.initial) query = query.ilike("text", `${filters.initial}%`)
  if (filters.search) query = query.ilike("text", `%${filters.search}%`)

  const { data, error } = await query.order("text", { ascending: true })
  if (error) throw error
  return (data as NameRow[]).map(fromRow)
}

/** Suggests a new name, private to one family. */
export async function suggestName(
  familyId: string,
  text: string,
  gender: Gender | null,
  origin: string | null,
): Promise<NameEntry> {
  const { data, error } = await supabase
    .from("names")
    .insert({ family_id: familyId, text: text.trim(), gender, origin })
    .select("id, text, gender, origin, family_id, suggested_by, created_at")
    .single()
  if (error) throw error
  return fromRow(data as NameRow)
}

export async function deleteSuggestion(nameId: string): Promise<void> {
  const { error } = await supabase.from("names").delete().eq("id", nameId)
  if (error) throw error
}

export type RankedName = {
  nameId: string
  text: string
  gender: Gender | null
  origin: string | null
  suggestedForFamilyId: string | null
  voteCount: number
  lastVotedAt: string
}

type RankingRow = {
  name_id: string
  text: string
  gender: Gender | null
  origin: string | null
  suggested_for_family_id: string | null
  vote_count: number
  last_voted_at: string
}

/**
 * A family's ranking, straight from family_name_rankings: distinct-voter
 * count first, most-recently-voted as the tiebreaker — computed in Postgres
 * so the client never has to derive an order from raw vote rows itself.
 */
export async function fetchFamilyRanking(familyId: string): Promise<RankedName[]> {
  const { data, error } = await supabase
    .from("family_name_rankings")
    .select("name_id, text, gender, origin, suggested_for_family_id, vote_count, last_voted_at")
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
  }))
}
