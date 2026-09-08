import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/services/session";
import { createDocument } from "@/services/documents";
import { convertMarkdownToTiptap, convertTextToTiptap } from "@/lib/import";
import { deriveTitleFromFilename, validateImportFile } from "@/validation/import";
import { internalError, jsonError } from "@/lib/http";
import type { TiptapDocument } from "@/types/document";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid upload", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("No file was provided", 400);
  }

  const validation = validateImportFile({ name: file.name, size: file.size });
  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return jsonError("We couldn't read this file. Please try again.", 400);
  }

  let content: TiptapDocument;
  try {
    content =
      validation.kind === "text" ? convertTextToTiptap(text) : convertMarkdownToTiptap(text);
  } catch {
    return jsonError("We couldn't parse this file's contents.", 400);
  }

  const title = deriveTitleFromFilename(file.name);

  try {
    const userId = await getCurrentUserId();
    const document = await createDocument(userId, title, content);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return internalError("POST /api/documents/import", error);
  }
}
