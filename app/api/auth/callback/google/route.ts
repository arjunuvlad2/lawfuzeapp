// app/api/auth/callback/google/route.ts
/**
 * POST /api/auth/callback/google
 * Forwards { id_token } to FastAPI /auth/google
 * Returns { access_token } JSON (no cookies).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GoogleProxyBody = { id_token: string };

function jsonSafeParse<T = any>(text: string): T | Record<string, never> {
  try { return JSON.parse(text) as T; } catch { return {}; }
}

export async function POST(req: Request) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ detail: "Expected application/json" }, { status: 415 });
    }

    const body = (await req.json()) as Partial<GoogleProxyBody>;
    if (!body?.id_token || typeof body.id_token !== "string") {
      return NextResponse.json({ detail: "Missing or invalid id_token" }, { status: 400 });
    }

    const base = (process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!base) {
      return NextResponse.json({ detail: "AUTH_API_URL / NEXT_PUBLIC_API_URL is not set" }, { status: 500 });
    }

    const upstream = await fetch(`${base}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: body.id_token }),
    });

    const text = await upstream.text();
    const data = jsonSafeParse(text);

    if (!upstream.ok) {
      const detail =
        (data as any)?.detail ||
        (data as any)?.message ||
        (upstream.status === 401 ? "Invalid Google token" :
         upstream.status === 403 ? "Access denied" :
         "Google sign-in failed");
      return NextResponse.json({ detail }, { status: upstream.status });
    }

    return NextResponse.json(data, { status: 200 }); // { access_token, ... }
  } catch {
    return NextResponse.json({ detail: "Proxy error contacting auth service" }, { status: 502 });
  }
}
