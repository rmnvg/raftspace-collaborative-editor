export interface DocumentCollaborator {
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  permission: "editor";
  createdAt: string;
}
