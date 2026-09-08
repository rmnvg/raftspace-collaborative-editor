// Pure authorization logic — no I/O. Callers are responsible for loading the
// document and its shares from the database (via the admin client, server
// side only) before checking access.

export type SharePermission = "editor";

export interface DocumentAccessRecord {
  id: string;
  ownerId: string;
}

export interface ShareRecord {
  documentId: string;
  userId: string;
  permission: SharePermission;
}

function findShare(
  document: DocumentAccessRecord,
  userId: string,
  shares: ShareRecord[],
): ShareRecord | undefined {
  return shares.find(
    (share) => share.documentId === document.id && share.userId === userId,
  );
}

export function canRead(
  document: DocumentAccessRecord,
  userId: string,
  shares: ShareRecord[],
): boolean {
  if (document.ownerId === userId) return true;
  return Boolean(findShare(document, userId, shares));
}

export function canEdit(
  document: DocumentAccessRecord,
  userId: string,
  shares: ShareRecord[],
): boolean {
  if (document.ownerId === userId) return true;
  return findShare(document, userId, shares)?.permission === "editor";
}

export function canManageSharing(
  document: DocumentAccessRecord,
  userId: string,
): boolean {
  return document.ownerId === userId;
}
