import { supabase } from "@/lib/supabase"

export type Family = {
  id: string
  name: string
  createdBy: string
  createdAt: string
  role: "owner" | "member"
}

type FamilyRow = { id: string; name: string; created_by: string; created_at: string }
type MemberRow = { family_id: string; role: "owner" | "member" }

/**
 * Every family the caller belongs to, with their role in each.
 *
 * Two queries rather than a join view, mirroring how sentences.ts keeps
 * reads simple where a view isn't already load-bearing: family_members is
 * small per user (a handful of rows at most), so this is one round trip
 * either way in practice.
 */
export async function fetchMyFamilies(userId: string): Promise<Family[]> {
  const { data: memberRows, error: memberErr } = await supabase
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", userId)
  if (memberErr) throw memberErr

  const roleByFamily = new Map(
    (memberRows as MemberRow[]).map((r) => [r.family_id, r.role]),
  )
  const ids = [...roleByFamily.keys()]
  if (ids.length === 0) return []

  const { data: familyRows, error: familyErr } = await supabase
    .from("families")
    .select("id, name, created_by, created_at")
    .in("id", ids)
  if (familyErr) throw familyErr

  return (familyRows as FamilyRow[])
    .map((f) => ({
      id: f.id,
      name: f.name,
      createdBy: f.created_by,
      createdAt: f.created_at,
      role: roleByFamily.get(f.id) ?? "member",
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Creates a family. The creator becomes its owner via the on_family_created trigger. */
export async function createFamily(name: string): Promise<Family> {
  const trimmed = name.trim()
  const { data, error } = await supabase
    .from("families")
    .insert({ name: trimmed })
    .select("id, name, created_by, created_at")
    .single()
  if (error) throw error
  const row = data as FamilyRow
  return { id: row.id, name: row.name, createdBy: row.created_by, createdAt: row.created_at, role: "owner" }
}

export type FamilyMemberProfile = {
  userId: string
  role: "owner" | "member"
  joinedAt: string
  displayName: string | null
  firstName: string | null
  avatarUrl: string | null
}

/** Roster for one family, joined against public_profiles for display info. */
export async function fetchFamilyRoster(familyId: string): Promise<FamilyMemberProfile[]> {
  const { data: members, error: memberErr } = await supabase
    .from("family_members")
    .select("user_id, role, joined_at")
    .eq("family_id", familyId)
  if (memberErr) throw memberErr

  const rows = members as { user_id: string; role: "owner" | "member"; joined_at: string }[]
  if (rows.length === 0) return []

  const { data: profiles, error: profileErr } = await supabase
    .from("public_profiles")
    .select("id, display_name, first_name, avatar_url")
    .in(
      "id",
      rows.map((r) => r.user_id),
    )
  if (profileErr) throw profileErr

  const profileById = new Map(
    (profiles as { id: string; display_name: string | null; first_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  )

  return rows.map((r) => {
    const p = profileById.get(r.user_id)
    return {
      userId: r.user_id,
      role: r.role,
      joinedAt: r.joined_at,
      displayName: p?.display_name ?? null,
      firstName: p?.first_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
    }
  })
}

/** Leaves a family (or, for an owner acting on someone else, removes a member — RLS decides which is allowed). */
export async function removeFamilyMember(familyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("family_id", familyId)
    .eq("user_id", userId)
  if (error) throw error
}

/** Creates an invite link token via the create_invitation() RPC. Returned once — never persisted in the clear. */
export async function createInvitation(familyId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_invitation", { p_family: familyId })
  if (error) throw error
  return data as string
}

/** Redeems an invite token, joining the caller to the family it belongs to. Returns the family id. */
export async function redeemInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_invitation", { p_token: token })
  if (error) throw error
  return data as string
}

export type Invitation = {
  id: string
  familyId: string
  createdBy: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
}

/** Invitations for a family the caller owns. Empty for a non-owner, per RLS — not an error. */
export async function fetchFamilyInvitations(familyId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("family_invitations")
    .select("id, family_id, created_by, expires_at, revoked_at, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (
    data as {
      id: string
      family_id: string
      created_by: string
      expires_at: string
      revoked_at: string | null
      created_at: string
    }[]
  ).map((r) => ({
    id: r.id,
    familyId: r.family_id,
    createdBy: r.created_by,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    createdAt: r.created_at,
  }))
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: invitationId })
  if (error) throw error
}
