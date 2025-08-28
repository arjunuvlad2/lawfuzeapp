// app/api/auth/me/route.ts
/**
 * GET /api/auth/me
 * Proxies to FastAPI /auth/me, passing the Authorization header through.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = req.headers.get("authorization") || "";

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!API_BASE) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_API_URL is not set" },
        { status: 500 }
      );
    }

    const resp = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    const text = await resp.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text || "Unexpected response" };
    }

    return NextResponse.json(payload, { status: resp.status });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
