import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  deriveTitleFromFilename,
  getImportKind,
  validateImportFile,
} from "./import";

describe("getImportKind", () => {
  it("recognizes .txt files", () => {
    expect(getImportKind("notes.txt")).toBe("text");
  });

  it("recognizes .md files case-insensitively", () => {
    expect(getImportKind("README.MD")).toBe("markdown");
  });

  it("rejects unsupported extensions", () => {
    expect(getImportKind("document.docx")).toBeNull();
    expect(getImportKind("image.png")).toBeNull();
    expect(getImportKind("no-extension")).toBeNull();
  });
});

describe("validateImportFile", () => {
  it("accepts a valid .txt file", () => {
    const result = validateImportFile({ name: "notes.txt", size: 1024 });
    expect(result).toEqual({ ok: true, kind: "text" });
  });

  it("accepts a valid .md file", () => {
    const result = validateImportFile({ name: "readme.md", size: 1024 });
    expect(result).toEqual({ ok: true, kind: "markdown" });
  });

  it("rejects an unsupported file type", () => {
    const result = validateImportFile({ name: "photo.png", size: 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/\.txt and \.md/);
  });

  it("rejects an empty file", () => {
    const result = validateImportFile({ name: "notes.txt", size: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/empty/i);
  });

  it("rejects a file over the 1 MB limit", () => {
    const result = validateImportFile({
      name: "notes.txt",
      size: MAX_IMPORT_FILE_SIZE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/1 MB/);
  });

  it("accepts a file exactly at the 1 MB limit", () => {
    const result = validateImportFile({ name: "notes.txt", size: MAX_IMPORT_FILE_SIZE_BYTES });
    expect(result.ok).toBe(true);
  });
});

describe("deriveTitleFromFilename", () => {
  it("strips the extension", () => {
    expect(deriveTitleFromFilename("meeting-notes.txt")).toBe("meeting-notes");
  });

  it("strips only the last extension", () => {
    expect(deriveTitleFromFilename("archive.tar.md")).toBe("archive.tar");
  });

  it("falls back to a generic title when nothing usable remains", () => {
    expect(deriveTitleFromFilename(".txt")).toBe("Untitled document");
  });

  it("trims and length-limits like any other document title", () => {
    expect(deriveTitleFromFilename("  spaced out.md  ".trim())).toBe("spaced out");
  });
});
