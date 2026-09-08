import type { ShareRecord } from "@/lib/permissions";

export type ShareGrantValidation =
  | { ok: true }
  | { ok: false; reason: "self-share" | "already-shared" };

// Pure pre-check run before the service touches the database. The
// document_shares composite primary key is the ultimate backstop against a
// concurrent duplicate, but this is what produces the clear, friendly
// conflict in the normal (non-racing) case.
export function validateShareGrant(
  ownerId: string,
  targetUserId: string,
  existingShares: ShareRecord[],
): ShareGrantValidation {
  if (targetUserId === ownerId) {
    return { ok: false, reason: "self-share" };
  }
  if (existingShares.some((share) => share.userId === targetUserId)) {
    return { ok: false, reason: "already-shared" };
  }
  return { ok: true };
}
