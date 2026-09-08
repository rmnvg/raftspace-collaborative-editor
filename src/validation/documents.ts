import { z } from "zod";
import type { TiptapDocument, TiptapNode } from "@/types/document";

export const documentIdSchema = z.string().uuid();

export const documentTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be 200 characters or fewer");

const tiptapMarkSchema = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.unknown()).optional(),
  })
  .passthrough();

// Recursive: a node may contain child nodes. This checks the basic Tiptap /
// ProseMirror JSON shape (every node has a "type", children nest under
// "content", text nodes carry "text") without hard-coding every node/mark
// type StarterKit can produce.
const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      attrs: z.record(z.unknown()).optional(),
      content: z.array(tiptapNodeSchema).optional(),
      text: z.string().optional(),
      marks: z.array(tiptapMarkSchema).optional(),
    })
    .passthrough(),
);

export const tiptapDocumentSchema: z.ZodType<TiptapDocument> = z
  .object({
    type: z.literal("doc"),
    content: z.array(tiptapNodeSchema),
  })
  .passthrough();

export const createDocumentSchema = z.object({
  title: documentTitleSchema,
});

export const updateDocumentSchema = z
  .object({
    title: documentTitleSchema.optional(),
    content: tiptapDocumentSchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Provide a title, content, or both",
  });

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}
