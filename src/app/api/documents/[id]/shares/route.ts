import { NextRequest, NextResponse } from "next/server";
import { canManageSharing, type DocumentAccessRecord } from "@/lib/permissions";
import { internalError, jsonError } from "@/lib/http";
import { documentIdSchema, firstIssueMessage } from "@/validation/documents";
import { createShareSchema } from "@/validation/sharing";
import { findAccessibleDocument } from "@/services/documents";
import { createShare, listDocumentShares } from "@/services/sharing";
import { getCurrentUserId } from "@/services/session";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const idResult = documentIdSchema.safeParse(params.id);
  if (!idResult.success) {
    return jsonError("Invalid document id", 400);
  }

  try {
    const userId = await getCurrentUserId();
    const access = await findAccessibleDocument(idResult.data, userId);
    if (!access) {
      return jsonError("Document not found", 404);
    }

    const accessRecord: DocumentAccessRecord = {
      id: access.document.id,
      ownerId: access.document.owner_id,
    };
    if (!canManageSharing(accessRecord, userId)) {
      return jsonError("Only the document owner can view sharing", 403);
    }

    const collaborators = await listDocumentShares(idResult.data);
    return NextResponse.json({ collaborators });
  } catch (error) {
    return internalError("GET /api/documents/[id]/shares", error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const idResult = documentIdSchema.safeParse(params.id);
  if (!idResult.success) {
    return jsonError("Invalid document id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstIssueMessage(parsed.error), 400);
  }

  try {
    const userId = await getCurrentUserId();
    const access = await findAccessibleDocument(idResult.data, userId);
    if (!access) {
      return jsonError("Document not found", 404);
    }

    const accessRecord: DocumentAccessRecord = {
      id: access.document.id,
      ownerId: access.document.owner_id,
    };
    if (!canManageSharing(accessRecord, userId)) {
      return jsonError("Only the document owner can share this document", 403);
    }

    const result = await createShare(idResult.data, userId, parsed.data.userId);
    switch (result.status) {
      case "self-share":
        return jsonError("You can't share a document with yourself", 400);
      case "unknown-user":
        return jsonError("Unknown user", 400);
      case "already-shared":
        return jsonError("This user already has access to this document", 409);
      case "created":
        return NextResponse.json({ collaborator: result.collaborator }, { status: 201 });
    }
  } catch (error) {
    return internalError("POST /api/documents/[id]/shares", error);
  }
}
