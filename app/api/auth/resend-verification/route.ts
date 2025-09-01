/**
 * POST /api/auth/resend-verification
 * Body: { email }
 * Proxies to FastAPI /auth/verification/send (always 202).
 */
import { NextResponse } from "next/server";

type InBody = { email?: string };

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as InBody | null;
  if (!body?.email || typeof body.email !== "string") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!API_BASE) {
    return NextResponse.json({ message: "NEXT_PUBLIC_API_URL is not set" }, { status: 500 });
  }

  const upstream = await fetch(`${API_BASE}/auth/verification/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
    cache: "no-store",
  });

  // Normalize to JSON and pass through status (FastAPI uses 202)
  return NextResponse.json({ ok: upstream.ok }, { status: upstream.status || 202 });
}
