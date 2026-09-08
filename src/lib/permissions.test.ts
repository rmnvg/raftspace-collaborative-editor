import { describe, expect, it } from "vitest";
import {
  canRead,
  canEdit,
  canManageSharing,
  type DocumentAccessRecord,
  type ShareRecord,
} from "./permissions";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const SHARED_EDITOR_ID = "22222222-2222-2222-2222-222222222222";
const UNRELATED_USER_ID = "33333333-3333-3333-3333-333333333333";

const document: DocumentAccessRecord = {
  id: "doc-1",
  ownerId: OWNER_ID,
};

const shares: ShareRecord[] = [
  { documentId: "doc-1", userId: SHARED_EDITOR_ID, permission: "editor" },
  // A share on a different document should never grant access to "doc-1".
  { documentId: "doc-2", userId: UNRELATED_USER_ID, permission: "editor" },
];

describe("permissions", () => {
  describe("owner", () => {
    it("can read, edit, and manage sharing", () => {
      expect(canRead(document, OWNER_ID, shares)).toBe(true);
      expect(canEdit(document, OWNER_ID, shares)).toBe(true);
      expect(canManageSharing(document, OWNER_ID)).toBe(true);
    });
  });

  describe("shared editor", () => {
    it("can read and edit, but cannot manage sharing", () => {
      expect(canRead(document, SHARED_EDITOR_ID, shares)).toBe(true);
      expect(canEdit(document, SHARED_EDITOR_ID, shares)).toBe(true);
      expect(canManageSharing(document, SHARED_EDITOR_ID)).toBe(false);
    });
  });

  describe("unrelated user", () => {
    it("cannot read, edit, or manage sharing", () => {
      expect(canRead(document, UNRELATED_USER_ID, shares)).toBe(false);
      expect(canEdit(document, UNRELATED_USER_ID, shares)).toBe(false);
      expect(canManageSharing(document, UNRELATED_USER_ID)).toBe(false);
    });
  });

  describe("no shares at all", () => {
    it("only the owner has access", () => {
      expect(canRead(document, OWNER_ID, [])).toBe(true);
      expect(canRead(document, SHARED_EDITOR_ID, [])).toBe(false);
      expect(canEdit(document, SHARED_EDITOR_ID, [])).toBe(false);
    });
  });
});
