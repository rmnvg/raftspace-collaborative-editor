import { NextRequest, NextResponse } from "next/server";
import { canManageSharing, type DocumentAccessRecord } from "@/lib/permissions";
import { internalError, jsonError } from "@/lib/http";
import { documentIdSchema } from "@/validation/documents";
import { shareUserIdSchema } from "@/validation/sharing";
import { findAccessibleDocument } from "@/services/documents";
import { removeShare } from "@/services/sharing";
import { getCurrentUserId } from "@/services/session";

interface RouteParams {
  params: { id: string; userId: string };
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const idResult = documentIdSchema.safeParse(params.id);
  const targetUserIdResult = shareUserIdSchema.safeParse(params.userId);
  if (!idResult.success || !targetUserIdResult.success) {
    return jsonError("Invalid request", 400);
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
      return jsonError("Only the document owner can manage sharing", 403);
    }

    const removed = await removeShare(idResult.data, targetUserIdResult.data);
    if (!removed) {
      return jsonError("This user doesn't have access to remove", 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError("DELETE /api/documents/[id]/shares/[userId]", error);
  }
}
