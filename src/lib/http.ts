import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Logs the real error server-side but never leaks internal details (e.g.
// Supabase error text) to the client.
export function internalError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return jsonError("Something went wrong. Please try again.", 500);
}
