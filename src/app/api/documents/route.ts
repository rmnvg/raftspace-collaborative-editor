import { NextRequest, NextResponse } from "next/server";
import { createDocumentSchema, firstIssueMessage } from "@/validation/documents";
import { createDocument, listDocumentsForUser } from "@/services/documents";
import { getCurrentUserId } from "@/services/session";
import { internalError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { owned, shared } = await listDocumentsForUser(userId);
    return NextResponse.json({ owned, shared });
  } catch (error) {
    return internalError("GET /api/documents", error);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(firstIssueMessage(parsed.error), 400);
  }

  try {
    const userId = await getCurrentUserId();
    const document = await createDocument(userId, parsed.data.title);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return internalError("POST /api/documents", error);
  }
}
