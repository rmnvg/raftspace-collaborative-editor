import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

type AppUserRow = Database["public"]["Tables"]["app_users"]["Row"];

function toAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

export async function listAppUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load demo users: ${error.message}`);
  }

  return (data ?? []).map(toAppUser);
}

export async function getAppUserById(id: string): Promise<AppUser | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load demo user: ${error.message}`);
  }

  return data ? toAppUser(data) : null;
}
