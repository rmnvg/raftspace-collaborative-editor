import { describe, expect, it } from "vitest";
import { tiptapDocumentSchema } from "@/validation/documents";
import { convertMarkdownToTiptap, convertTextToTiptap } from "./import";

describe("convertTextToTiptap", () => {
  it("produces a document that satisfies the Tiptap JSON schema", () => {
    const result = convertTextToTiptap("Hello world");
    expect(tiptapDocumentSchema.safeParse(result).success).toBe(true);
  });

  it("splits blank-line-separated text into separate paragraphs", () => {
    const result = convertTextToTiptap("First paragraph.\n\nSecond paragraph.");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First paragraph." }] },
        { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
      ],
    });
  });

  it("preserves single line breaks within a paragraph as hard breaks", () => {
    const result = convertTextToTiptap("Line one\nLine two");
    expect(result.content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Line one" },
          { type: "hardBreak" },
          { type: "text", text: "Line two" },
        ],
      },
    ]);
  });

  it("returns a single empty paragraph for empty or whitespace-only input", () => {
    expect(convertTextToTiptap("")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(convertTextToTiptap("   \n\n  ")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("normalizes CRLF line endings", () => {
    const result = convertTextToTiptap("First.\r\n\r\nSecond.");
    expect(result.content).toHaveLength(2);
  });
});

describe("convertMarkdownToTiptap", () => {
  it("produces a document that satisfies the Tiptap JSON schema", () => {
    const result = convertMarkdownToTiptap("# Title\n\nSome **bold** and _italic_ text.");
    expect(tiptapDocumentSchema.safeParse(result).success).toBe(true);
  });

  it("converts headings to heading nodes", () => {
    const result = convertMarkdownToTiptap("# Heading One\n\n## Heading Two");
    expect(result.content).toEqual([
      {
        type: "heading",
        attrs: expect.objectContaining({ level: 1 }),
        content: [{ type: "text", text: "Heading One" }],
      },
      {
        type: "heading",
        attrs: expect.objectContaining({ level: 2 }),
        content: [{ type: "text", text: "Heading Two" }],
      },
    ]);
  });

  it("converts bold and italic markup to marks", () => {
    const result = convertMarkdownToTiptap("**bold** and *italic*");
    const paragraph = result.content[0];
    expect(paragraph?.type).toBe("paragraph");
    const boldNode = paragraph?.content?.find((node) => node.text === "bold");
    const italicNode = paragraph?.content?.find((node) => node.text === "italic");
    expect(boldNode?.marks).toEqual([{ type: "bold" }]);
    expect(italicNode?.marks).toEqual([{ type: "italic" }]);
  });

  it("converts unordered and ordered lists", () => {
    const bulletResult = convertMarkdownToTiptap("- one\n- two");
    expect(bulletResult.content?.[0]?.type).toBe("bulletList");

    const orderedResult = convertMarkdownToTiptap("1. one\n2. two");
    expect(orderedResult.content?.[0]?.type).toBe("orderedList");
  });

  it("drops markup the editor schema doesn't support (e.g. images)", () => {
    const result = convertMarkdownToTiptap("![alt text](https://example.com/pic.png)");
    const json = JSON.stringify(result);
    expect(json).not.toContain("image");
  });

  it("returns a single empty paragraph for empty input", () => {
    expect(convertMarkdownToTiptap("")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});
