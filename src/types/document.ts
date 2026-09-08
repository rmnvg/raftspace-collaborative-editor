export type DocumentRelationship = "owner" | "shared";

export interface DocumentOwnerInfo {
  id: string;
  name: string;
  avatarColor: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner: DocumentOwnerInfo;
  relationship: DocumentRelationship;
}

export interface DocumentDetail extends DocumentSummary {
  content: TiptapDocument;
  canEdit: boolean;
  canManageSharing: boolean;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface TiptapDocument {
  type: "doc";
  content: TiptapNode[];
}
