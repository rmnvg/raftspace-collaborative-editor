import "server-only";
import { cookies } from "next/headers";
import { listAppUsers, getAppUserById, type AppUser } from "@/services/users";

export const DEMO_SESSION_COOKIE = "draftspace_demo_user";

// Documented default demo user when no cookie is present (or the cookie
// references a user id that no longer exists).
export const DEFAULT_DEMO_USER_NAME = "Ramanjot Singh";

export interface DemoSession {
  currentUser: AppUser;
  users: AppUser[];
}

export async function resolveDemoSession(): Promise<DemoSession> {
  const users = await listAppUsers();
  const [firstUser] = users;
  if (!firstUser) {
    throw new Error(
      "No demo users are seeded. Apply supabase/migrations/20260908010000_init.sql before starting the app.",
    );
  }

  const cookieUserId = cookies().get(DEMO_SESSION_COOKIE)?.value;
  const currentUser =
    users.find((user) => user.id === cookieUserId) ??
    users.find((user) => user.name === DEFAULT_DEMO_USER_NAME) ??
    firstUser;

  return { currentUser, users };
}

// Validates a candidate user id against the actual seeded users in the
// database — the request body alone is never treated as proof of identity.
export async function findDemoUserById(userId: string): Promise<AppUser | null> {
  return getAppUserById(userId);
}

// Lightweight identity resolution for routes that only need the acting
// user's id (not the full user picker list). Identity always comes from the
// server-side cookie/DB lookup, never from a request body.
export async function getCurrentUserId(): Promise<string> {
  const cookieUserId = cookies().get(DEMO_SESSION_COOKIE)?.value;
  if (cookieUserId) {
    const user = await getAppUserById(cookieUserId);
    if (user) return user.id;
  }

  const users = await listAppUsers();
  const fallback =
    users.find((user) => user.name === DEFAULT_DEMO_USER_NAME) ?? users[0];
  if (!fallback) {
    throw new Error(
      "No demo users are seeded. Apply supabase/migrations/20260908010000_init.sql before starting the app.",
    );
  }
  return fallback.id;
}
