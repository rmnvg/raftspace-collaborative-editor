import { describe, expect, it } from "vitest";
import {
  createDocumentSchema,
  documentTitleSchema,
  tiptapDocumentSchema,
  updateDocumentSchema,
} from "./documents";

describe("documentTitleSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(documentTitleSchema.parse("  My Document  ")).toBe("My Document");
  });

  it("rejects an empty title", () => {
    expect(documentTitleSchema.safeParse("").success).toBe(false);
  });

  it("rejects a title that is only whitespace", () => {
    expect(documentTitleSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    expect(documentTitleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });

  it("accepts a title exactly 200 characters long", () => {
    expect(documentTitleSchema.safeParse("a".repeat(200)).success).toBe(true);
  });
});

describe("tiptapDocumentSchema", () => {
  it("accepts a minimal empty document", () => {
    const result = tiptapDocumentSchema.safeParse({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts nested content with text and marks", () => {
    const result = tiptapDocumentSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
        },
        { type: "bulletList", content: [{ type: "listItem", content: [] }] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a root type other than doc", () => {
    const result = tiptapDocumentSchema.safeParse({
      type: "paragraph",
      content: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects content that is not an array", () => {
    const result = tiptapDocumentSchema.safeParse({
      type: "doc",
      content: "not an array",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a node missing a type", () => {
    const result = tiptapDocumentSchema.safeParse({
      type: "doc",
      content: [{ text: "no type here" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createDocumentSchema", () => {
  it("requires a non-empty title", () => {
    expect(createDocumentSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createDocumentSchema.safeParse({ title: "Notes" }).success).toBe(true);
  });
});

describe("updateDocumentSchema", () => {
  it("rejects an empty payload", () => {
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a title-only update", () => {
    expect(updateDocumentSchema.safeParse({ title: "Renamed" }).success).toBe(true);
  });

  it("accepts a content-only update", () => {
    expect(
      updateDocumentSchema.safeParse({
        content: { type: "doc", content: [{ type: "paragraph" }] },
      }).success,
    ).toBe(true);
  });
});
