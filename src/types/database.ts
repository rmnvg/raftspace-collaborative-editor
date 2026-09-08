export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_color: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_users"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          title: string;
          content: Record<string, unknown>;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content?: Record<string, unknown>;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_shares: {
        Row: {
          document_id: string;
          user_id: string;
          permission: "editor";
          created_at: string;
        };
        Insert: {
          document_id: string;
          user_id: string;
          permission?: "editor";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["document_shares"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
