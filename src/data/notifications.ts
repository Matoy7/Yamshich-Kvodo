import { supabase } from "@/lib/supabase"
import { fetchAuthors, authorName } from "./completions"
import { fetchLikes } from "./likes"

export type NotificationType = "completion_liked" | "sentence_completed" | "completion_leading"

export type Notification = {
  id: string
  type: NotificationType
  read: boolean
  createdAt: string
  /** How many likes are folded into this row (only >1 for a grouped
   *  completion_liked notification). */
  groupCount: number
  /** Null for completion_leading — that notification is about a ranking
   *  change, not a specific person's action. */
  actorName: string | null
  sentenceId: string
  sentenceText: string
  completionId: string
  completionText: string
  /** Current like count on the completion. Only meaningful (and only
   *  fetched) for completion_leading, for its "12 לייקים" line. */
  likeCount: number
}

/** Shape PostgREST returns when embedding the two readable-by-anyone tables
 *  the notification points at. Embedding `profiles` for the actor is
 *  deliberately not attempted here — RLS on `profiles` only allows reading
 *  your own row, so an embed would silently come back null for anyone
 *  else's; author names are batched separately via `fetchAuthors`, exactly
 *  like every other author lookup in this app. */
type NotificationRow = {
  id: string
  type: NotificationType
  read: boolean
  created_at: string
  group_count: number
  actor_id: string | null
  sentence_id: string
  completion_id: string
  sentence: { text: string } | { text: string }[] | null
  completion: { text: string } | { text: string }[] | null
}

/** PostgREST embeds a to-one relationship as an object normally, but as a
 *  one-element array under some client/type-generation configurations —
 *  this project has no generated types, so handle both defensively. */
function embeddedText(value: NotificationRow["sentence"]): string {
  if (!value) return ""
  return Array.isArray(value) ? (value[0]?.text ?? "") : value.text
}

const NOTIFICATIONS_SELECT =
  "id, type, read, created_at, group_count, actor_id, sentence_id, completion_id, " +
  "sentence:sentences(text), completion:completions(text)"

/**
 * The signed-in user's notifications, newest first.
 *
 * Fetched only when the bell's popover actually opens — never on every feed
 * render — mirroring how completions themselves are only fetched once their
 * popover opens (see useCompletions). Author names and, for leading-
 * completion rows only, current like counts are resolved in two further
 * batched requests, the same shape as fetchLeadingCompletions.
 */
export async function fetchNotifications(
  userId: string,
  limit = 20,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATIONS_SELECT)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const rows = (data ?? []) as unknown as NotificationRow[]
  if (rows.length === 0) return []

  const actorIds = rows
    .map((row) => row.actor_id)
    .filter((id): id is string => Boolean(id))
  const leadingCompletionIds = rows
    .filter((row) => row.type === "completion_leading")
    .map((row) => row.completion_id)

  const [authors, likes] = await Promise.all([
    fetchAuthors(actorIds),
    leadingCompletionIds.length > 0
      ? fetchLikes(leadingCompletionIds, null)
      : Promise.resolve(new Map()),
  ])

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    read: row.read,
    createdAt: row.created_at,
    groupCount: row.group_count,
    actorName: row.actor_id ? authorName(authors.get(row.actor_id)) : null,
    sentenceId: row.sentence_id,
    sentenceText: embeddedText(row.sentence),
    completionId: row.completion_id,
    completionText: embeddedText(row.completion),
    likeCount: likes.get(row.completion_id)?.count ?? 0,
  }))
}

/**
 * How many of the user's notifications are unread — the bell badge.
 *
 * `head: true` asks Postgres for the count only, no rows transferred. Same
 * shape as fetchNavCounts. A failure resolves to 0 rather than throwing: the
 * badge is decorative, and a wrong badge is a much smaller problem than a
 * broken header.
 */
export async function fetchUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false)

  if (error) return 0
  return count ?? 0
}

/** Marks every one of the user's unread notifications as read (the "סמן הכל
 *  כנקרא" action). RLS already confines this to the caller's own rows. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false)

  if (error) throw error
}

/** Marks one notification as read, e.g. once the user opens it. */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)

  if (error) throw error
}
