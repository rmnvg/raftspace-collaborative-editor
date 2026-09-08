import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  DEMO_SESSION_COOKIE,
  findDemoUserById,
  resolveDemoSession,
} from "@/services/session";

export async function GET() {
  try {
    const session = await resolveDemoSession();
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session" },
      { status: 500 },
    );
  }
}

const selectUserSchema = z.object({ userId: z.string().uuid() });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = selectUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid userId is required" }, { status: 400 });
  }

  // The submitted id is only a *candidate* — it is checked against the real
  // seeded users in the database before it is trusted for anything.
  const user = await findDemoUserById(parsed.data.userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }

  cookies().set(DEMO_SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ currentUser: user });
}
