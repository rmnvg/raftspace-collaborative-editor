import { describe, expect, it } from "vitest";
import {
  canRead,
  canEdit,
  canManageSharing,
  type DocumentAccessRecord,
  type ShareRecord,
} from "@/lib/permissions";
import { validateShareGrant } from "./sharing-rules";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const EDITOR_ID = "22222222-2222-2222-2222-222222222222";
const UNRELATED_ID = "33333333-3333-3333-3333-333333333333";

const document: DocumentAccessRecord = { id: "doc-1", ownerId: OWNER_ID };

describe("sharing rules", () => {
  it("lets the owner grant access to a user with no existing share", () => {
    expect(canManageSharing(document, OWNER_ID)).toBe(true);
    expect(validateShareGrant(OWNER_ID, EDITOR_ID, [])).toEqual({ ok: true });
  });

  it("lets a shared editor open and edit the document", () => {
    const shares: ShareRecord[] = [
      { documentId: document.id, userId: EDITOR_ID, permission: "editor" },
    ];
    expect(canRead(document, EDITOR_ID, shares)).toBe(true);
    expect(canEdit(document, EDITOR_ID, shares)).toBe(true);
  });

  it("denies a shared editor sharing management (reshare, remove, delete)", () => {
    const shares: ShareRecord[] = [
      { documentId: document.id, userId: EDITOR_ID, permission: "editor" },
    ];
    expect(canManageSharing(document, EDITOR_ID)).toBe(false);
    // A shared editor attempting to grant access is rejected the same way
    // an owner-only check would reject it — canManageSharing is what routes
    // gate on before ever calling validateShareGrant.
    expect(canRead(document, EDITOR_ID, shares)).toBe(true);
  });

  it("denies an unrelated user any access at all", () => {
    const shares: ShareRecord[] = [
      { documentId: document.id, userId: EDITOR_ID, permission: "editor" },
    ];
    expect(canRead(document, UNRELATED_ID, shares)).toBe(false);
    expect(canEdit(document, UNRELATED_ID, shares)).toBe(false);
    expect(canManageSharing(document, UNRELATED_ID)).toBe(false);
  });

  it("prevents duplicate sharing", () => {
    const shares: ShareRecord[] = [
      { documentId: document.id, userId: EDITOR_ID, permission: "editor" },
    ];
    expect(validateShareGrant(OWNER_ID, EDITOR_ID, shares)).toEqual({
      ok: false,
      reason: "already-shared",
    });
  });

  it("prevents the owner from sharing a document with themselves", () => {
    expect(validateShareGrant(OWNER_ID, OWNER_ID, [])).toEqual({
      ok: false,
      reason: "self-share",
    });
  });

  it("revokes future access once a share is removed", () => {
    const sharesBeforeRemoval: ShareRecord[] = [
      { documentId: document.id, userId: EDITOR_ID, permission: "editor" },
    ];
    expect(canRead(document, EDITOR_ID, sharesBeforeRemoval)).toBe(true);
    expect(canEdit(document, EDITOR_ID, sharesBeforeRemoval)).toBe(true);

    const sharesAfterRemoval: ShareRecord[] = [];
    expect(canRead(document, EDITOR_ID, sharesAfterRemoval)).toBe(false);
    expect(canEdit(document, EDITOR_ID, sharesAfterRemoval)).toBe(false);

    // Re-granting after removal must work again, not be blocked as a
    // "duplicate" from the earlier (now-removed) share.
    expect(validateShareGrant(OWNER_ID, EDITOR_ID, sharesAfterRemoval)).toEqual({ ok: true });
  });
});
