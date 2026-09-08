import { NextRequest, NextResponse } from "next/server";
import { canEdit, canManageSharing, type DocumentAccessRecord } from "@/lib/permissions";
import { internalError, jsonError } from "@/lib/http";
import {
  documentIdSchema,
  firstIssueMessage,
  updateDocumentSchema,
} from "@/validation/documents";
import {
  deleteDocumentById,
  findAccessibleDocument,
  toDetail,
  updateDocumentFields,
} from "@/services/documents";
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
    return NextResponse.json({
      document: toDetail(access.document, userId, access.shares),
    });
  } catch (error) {
    return internalError("GET /api/documents/[id]", error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const parsed = updateDocumentSchema.safeParse(body);
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
    if (!canEdit(accessRecord, userId, access.shares)) {
      return jsonError("You do not have permission to edit this document", 403);
    }

    const updated = await updateDocumentFields(idResult.data, parsed.data);
    return NextResponse.json({ document: toDetail(updated, userId, access.shares) });
  } catch (error) {
    return internalError("PATCH /api/documents/[id]", error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
      return jsonError("Only the document owner can delete this document", 403);
    }

    await deleteDocumentById(idResult.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError("DELETE /api/documents/[id]", error);
  }
}
