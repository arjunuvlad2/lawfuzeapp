/**
 * POST /api/auth/login
 * Forwards { email, password } to FastAPI /auth/login
 * Normalizes common errors (e.g. EMAIL_UNVERIFIED).
 */
import { NextResponse } from "next/server";

interface LoginBody { email: string; password: string }

function parseJsonSafe(text: string): any {
  try { return text ? JSON.parse(text) : null } catch { return null }
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => null)) as Partial<LoginBody> | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!API_BASE) {
      return NextResponse.json({ message: "NEXT_PUBLIC_API_URL is not set" }, { status: 500 });
    }

    const upstream = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    const ct = upstream.headers.get("content-type") || "";
    const raw = await upstream.text();
    const data = ct.includes("application/json") ? parseJsonSafe(raw) : null;
    const detail = str(data?.detail) ?? str(data?.message);

    // ── Friendly normalization ──────────────────────────────────────────────
    if (!upstream.ok) {
      // Unverified email (support both spellings)
      const isUnverified =
        upstream.status === 403 &&
        (detail === "EMAIL_UNVERIFIED" || detail === "EMAIL_NOT_VERIFIED");

      if (isUnverified) {
        return NextResponse.json(
          {
            code: "EMAIL_UNVERIFIED",
            email: body.email,
            message: "Email not verified",
          },
          { status: 403 },
        );
      }

      // Invalid credentials
      if (upstream.status === 401) {
        return NextResponse.json(
          { message: "Invalid credentials. Please try again." },
          { status: 401 },
        );
      }

      // Fallback
      return NextResponse.json(
        { message: detail || `Login failed (${upstream.status})` },
        { status: upstream.status },
      );
    }

    // Success: pass-through JSON
    const okJson = data ?? parseJsonSafe(raw) ?? {};
    return NextResponse.json(okJson, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
