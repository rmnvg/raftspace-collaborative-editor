import { z } from "zod";
import { documentTitleSchema } from "@/validation/documents";

export const MAX_IMPORT_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
export const IMPORT_ACCEPT = ".txt,.md";

export type ImportKind = "text" | "markdown";

export function getImportKind(filename: string): ImportKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return "text";
  if (lower.endsWith(".md")) return "markdown";
  return null;
}

export interface ImportFileMeta {
  name: string;
  size: number;
}

const importFileMetaSchema = z.object({
  name: z.string().min(1, "The file needs a name"),
  size: z
    .number()
    .int()
    .positive("The selected file is empty")
    .max(MAX_IMPORT_FILE_SIZE_BYTES, "Files must be 1 MB or smaller"),
});

export type ImportValidationResult =
  | { ok: true; kind: ImportKind }
  | { ok: false; message: string };

export function validateImportFile(meta: ImportFileMeta): ImportValidationResult {
  const parsed = importFileMetaSchema.safeParse(meta);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid file" };
  }

  const kind = getImportKind(parsed.data.name);
  if (!kind) {
    return { ok: false, message: "Only .txt and .md files can be imported" };
  }

  return { ok: true, kind };
}

// "The basename becomes the initial document title" — strip the extension
// and fall back to a generic title if that leaves nothing usable.
export function deriveTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  const parsed = documentTitleSchema.safeParse(base);
  return parsed.success ? parsed.data : "Untitled document";
}
