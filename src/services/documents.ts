import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canEdit,
  canManageSharing,
  type DocumentAccessRecord,
  type ShareRecord,
} from "@/lib/permissions";
import type { DocumentDetail, DocumentSummary, TiptapDocument } from "@/types/document";

interface OwnerRow {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  created_at: string;
}

interface DocumentRow {
  id: string;
  title: string;
  content: TiptapDocument;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentWithOwnerRow extends DocumentRow {
  owner: OwnerRow;
}

interface ShareWithDocumentRow {
  document_id: string;
  user_id: string;
  permission: "editor";
  created_at: string;
  document: DocumentWithOwnerRow;
}

interface ShareRow {
  document_id: string;
  user_id: string;
  permission: "editor";
  created_at: string;
}

// Only one foreign key runs from documents to app_users (owner_id), so
// PostgREST can embed it unambiguously as "owner".
const DOCUMENT_WITH_OWNER_SELECT = "*, owner:app_users(*)";

function toSummary(
  row: DocumentWithOwnerRow,
  relationship: "owner" | "shared",
): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: {
      id: row.owner.id,
      name: row.owner.name,
      avatarColor: row.owner.avatar_color,
    },
    relationship,
  };
}

export function toDetail(
  document: DocumentWithOwnerRow,
  userId: string,
  shares: ShareRecord[],
): DocumentDetail {
  const access: DocumentAccessRecord = { id: document.id, ownerId: document.owner_id };
  return {
    ...toSummary(document, document.owner_id === userId ? "owner" : "shared"),
    content: document.content,
    canEdit: canEdit(access, userId, shares),
    canManageSharing: canManageSharing(access, userId),
  };
}

function sortByUpdatedAtDesc(documents: DocumentSummary[]): DocumentSummary[] {
  return [...documents].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export async function listDocumentsForUser(
  userId: string,
): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[] }> {
  const supabase = getSupabaseAdminClient();

  const [ownedResult, sharedResult] = await Promise.all([
    supabase
      .from("documents")
      .select(DOCUMENT_WITH_OWNER_SELECT)
      .eq("owner_id", userId)
      .returns<DocumentWithOwnerRow[]>(),
    supabase
      .from("document_shares")
      .select(
        `document_id, user_id, permission, created_at, document:documents(${DOCUMENT_WITH_OWNER_SELECT})`,
      )
      .eq("user_id", userId)
      .returns<ShareWithDocumentRow[]>(),
  ]);

  if (ownedResult.error) {
    throw new Error(`Failed to load owned documents: ${ownedResult.error.message}`);
  }
  if (sharedResult.error) {
    throw new Error(`Failed to load shared documents: ${sharedResult.error.message}`);
  }

  const owned = sortByUpdatedAtDesc(
    (ownedResult.data ?? []).map((row) => toSummary(row, "owner")),
  );
  const shared = sortByUpdatedAtDesc(
    (sharedResult.data ?? []).map((row) => toSummary(row.document, "shared")),
  );

  return { owned, shared };
}

export async function createDocument(
  ownerId: string,
  title: string,
): Promise<DocumentDetail> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({ title, owner_id: ownerId })
    .select(DOCUMENT_WITH_OWNER_SELECT)
    .single()
    .returns<DocumentWithOwnerRow>();

  if (error || !data) {
    throw new Error(`Failed to create document: ${error?.message ?? "unknown error"}`);
  }

  return toDetail(data, ownerId, []);
}

export interface DocumentAccess {
  document: DocumentWithOwnerRow;
  shares: ShareRecord[];
}

// Returns null when the document doesn't exist OR the user has no
// relationship to it at all (owner or shared) — the two cases are
// deliberately indistinguishable to the caller so routes can return a
// uniform 404 without revealing whether an inaccessible document exists.
export async function findAccessibleDocument(
  documentId: string,
  userId: string,
): Promise<DocumentAccess | null> {
  const supabase = getSupabaseAdminClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select(DOCUMENT_WITH_OWNER_SELECT)
    .eq("id", documentId)
    .maybeSingle()
    .returns<DocumentWithOwnerRow>();

  if (error) {
    throw new Error(`Failed to load document: ${error.message}`);
  }
  if (!document) return null;

  if (document.owner_id === userId) {
    return { document, shares: [] };
  }

  const { data: shareRow, error: shareError } = await supabase
    .from("document_shares")
    .select("document_id, user_id, permission, created_at")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle()
    .returns<ShareRow>();

  if (shareError) {
    throw new Error(`Failed to load document share: ${shareError.message}`);
  }
  if (!shareRow) return null;

  return {
    document,
    shares: [
      {
        documentId: shareRow.document_id,
        userId: shareRow.user_id,
        permission: shareRow.permission,
      },
    ],
  };
}

export async function getDocumentDetailForUser(
  documentId: string,
  userId: string,
): Promise<DocumentDetail | null> {
  const access = await findAccessibleDocument(documentId, userId);
  if (!access) return null;
  return toDetail(access.document, userId, access.shares);
}

export interface DocumentUpdateInput {
  title?: string;
  content?: TiptapDocument;
}

export async function updateDocumentFields(
  documentId: string,
  updates: DocumentUpdateInput,
): Promise<DocumentWithOwnerRow> {
  const supabase = getSupabaseAdminClient();
  const patch: { title?: string; content?: Record<string, unknown> } = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content !== undefined) {
    patch.content = updates.content as unknown as Record<string, unknown>;
  }

  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .select(DOCUMENT_WITH_OWNER_SELECT)
    .single()
    .returns<DocumentWithOwnerRow>();

  if (error || !data) {
    throw new Error(`Failed to update document: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

export async function deleteDocumentById(documentId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}
