// app/api/auth/me/route.ts
/**
 * GET /api/auth/me
 * Proxies to FastAPI /auth/me, passing the Authorization header through.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

    const resp = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    const payload = await resp.json().catch(() => ({}));
    return NextResponse.json(payload, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
