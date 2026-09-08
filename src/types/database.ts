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
      };
    };
  };
}
