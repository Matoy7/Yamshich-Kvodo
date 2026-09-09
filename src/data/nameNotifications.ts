import { supabase } from "@/lib/supabase"

export type NameNotification = {
  id: string
  read: boolean
  createdAt: string
  groupCount: number
  actorName: string | null
  nameId: string
  nameText: string
  familyId: string
}

/** PostgREST embeds a to-one relationship as an object normally, but as a
 *  one-element array under some client/type-generation configurations —
 *  handled defensively, same as the retired data/notifications.ts did. */
function embeddedText(value: { text: string } | { text: string }[] | null): string {
  if (!value) return ""
  return Array.isArray(value) ? (value[0]?.text ?? "") : value.text
}

type Row = {
  id: string
  read: boolean
  created_at: string
  group_count: number
  actor_id: string | null
  name_id: string
  family_id: string
  name: { text: string } | { text: string }[] | null
}

const SELECT = "id, read, created_at, group_count, actor_id, name_id, family_id, name:names(text)"

/**
 * Actor names are resolved via a separate batched public_profiles lookup,
 * not a direct embed — profiles' own RLS only allows reading your own row,
 * so an embed would silently come back null for anyone else's. Same
 * approach the retired sentence notifications used for author names.
 */
async function resolveActorNames(actorIds: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(actorIds.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, display_name, first_name")
    .in("id", unique)
  if (error) return new Map()

  return new Map(
    (data as { id: string; display_name: string | null; first_name: string | null }[]).map((p) => [
      p.id,
      p.display_name?.trim() || p.first_name?.trim() || "מישהו",
    ]),
  )
}

export async function fetchUnreadNameNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("name_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false)
  if (error) throw error
  return count ?? 0
}

export async function fetchNameNotifications(userId: string): Promise<NameNotification[]> {
  const { data, error } = await supabase
    .from("name_notifications")
    .select(SELECT)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(30)
  if (error) throw error

  const rows = data as unknown as Row[]
  const actorNames = await resolveActorNames(rows.map((r) => r.actor_id))

  return rows.map((row) => ({
    id: row.id,
    read: row.read,
    createdAt: row.created_at,
    groupCount: row.group_count,
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? "מישהו") : null,
    nameId: row.name_id,
    nameText: embeddedText(row.name),
    familyId: row.family_id,
  }))
}

export async function markNameNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("name_notifications").update({ read: true }).eq("id", id)
  if (error) throw error
}

export async function markAllNameNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("name_notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false)
  if (error) throw error
}
