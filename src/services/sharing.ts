import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateShareGrant } from "@/lib/sharing-rules";
import type { ShareRecord } from "@/lib/permissions";
import type { DocumentCollaborator } from "@/types/sharing";

interface ShareRow {
  document_id: string;
  user_id: string;
  permission: "editor";
  created_at: string;
}

interface ShareWithUserRow extends ShareRow {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_color: string;
  };
}

async function getShareRecordsForDocument(documentId: string): Promise<ShareRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("document_id, user_id, permission, created_at")
    .eq("document_id", documentId)
    .returns<ShareRow[]>();

  if (error) {
    throw new Error(`Failed to load shares: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    documentId: row.document_id,
    userId: row.user_id,
    permission: row.permission,
  }));
}

export async function listDocumentShares(documentId: string): Promise<DocumentCollaborator[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("document_id, user_id, permission, created_at, user:app_users!document_shares_user_id_fkey(*)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true })
    .returns<ShareWithUserRow[]>();

  if (error) {
    throw new Error(`Failed to load collaborators: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    avatarColor: row.user.avatar_color,
    permission: row.permission,
    createdAt: row.created_at,
  }));
}

export type CreateShareResult =
  | { status: "created"; collaborator: DocumentCollaborator }
  | { status: "self-share" }
  | { status: "unknown-user" }
  | { status: "already-shared" };

export async function createShare(
  documentId: string,
  ownerId: string,
  targetUserId: string,
): Promise<CreateShareResult> {
  const supabase = getSupabaseAdminClient();

  const { data: targetUser, error: userError } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (userError) {
    throw new Error(`Failed to look up user: ${userError.message}`);
  }
  if (!targetUser) {
    return { status: "unknown-user" };
  }

  const existingShares = await getShareRecordsForDocument(documentId);
  const validation = validateShareGrant(ownerId, targetUserId, existingShares);
  if (!validation.ok) {
    return { status: validation.reason };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("document_shares")
    .insert({ document_id: documentId, user_id: targetUserId, permission: "editor" })
    .select("document_id, user_id, permission, created_at")
    .single()
    .returns<ShareRow>();

  if (insertError) {
    // Unique-violation backstop for a concurrent duplicate grant that slips
    // past the pre-check above.
    if (insertError.code === "23505") {
      return { status: "already-shared" };
    }
    throw new Error(`Failed to create share: ${insertError.message}`);
  }
  if (!inserted) {
    throw new Error("Failed to create share: no row returned");
  }

  return {
    status: "created",
    collaborator: {
      userId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      avatarColor: targetUser.avatar_color,
      permission: inserted.permission,
      createdAt: inserted.created_at,
    },
  };
}

// Returns whether a share actually existed and was removed, so the route
// can tell "removed" apart from "there was nothing to remove".
export async function removeShare(documentId: string, targetUserId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("document_shares")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", targetUserId)
    .select("user_id");

  if (error) {
    throw new Error(`Failed to remove share: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}
