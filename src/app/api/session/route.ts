import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { internalError, jsonError } from "@/lib/http";
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
    return internalError("GET /api/session", error);
  }
}

const selectUserSchema = z.object({ userId: z.string().uuid() });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = selectUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("A valid userId is required", 400);
  }

  let user;
  try {
    // The submitted id is only a *candidate* — it is checked against the
    // real seeded users in the database before it is trusted for anything.
    user = await findDemoUserById(parsed.data.userId);
  } catch (error) {
    return internalError("POST /api/session", error);
  }
  if (!user) {
    return jsonError("Unknown demo user", 400);
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
