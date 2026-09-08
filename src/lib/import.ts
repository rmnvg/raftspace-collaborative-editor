import { marked } from "marked";
import { generateJSON } from "@tiptap/html";
import { tiptapExtensions } from "@/lib/tiptap-extensions";
import type { TiptapDocument, TiptapNode } from "@/types/document";

const EMPTY_DOCUMENT: TiptapDocument = { type: "doc", content: [{ type: "paragraph" }] };

// Preserves paragraphs (blank-line-separated) and single line breaks within
// a paragraph (as hard breaks) without inventing formatting that wasn't there.
export function convertTextToTiptap(text: string): TiptapDocument {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return EMPTY_DOCUMENT;

  const content: TiptapNode[] = normalized.split(/\n{2,}/).map((paragraph) => {
    const lines = paragraph.split("\n");
    const inline: TiptapNode[] = [];
    lines.forEach((line, index) => {
      if (index > 0) inline.push({ type: "hardBreak" });
      if (line.length > 0) inline.push({ type: "text", text: line });
    });
    return inline.length > 0 ? { type: "paragraph", content: inline } : { type: "paragraph" };
  });

  return { type: "doc", content };
}

// Markdown -> HTML (marked) -> Tiptap JSON (generateJSON), using the same
// extension set as the live editor. generateJSON only emits node/mark types
// the supplied extensions define, so anything the editor doesn't support is
// dropped automatically — no separate sanitizer or hand-rolled AST needed.
export function convertMarkdownToTiptap(markdown: string): TiptapDocument {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  const json = generateJSON(html, tiptapExtensions) as unknown as TiptapDocument;

  if (!json.content || json.content.length === 0) {
    return EMPTY_DOCUMENT;
  }
  return json;
}
