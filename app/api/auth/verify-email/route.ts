// app/api/auth/verify-email/route.ts
/**
 * POST /api/auth/verify-email
 * Proxies { token } to FastAPI /auth/verification/confirm.
 * Always returns JSON so the client can render friendly errors.
 */
import { NextResponse } from "next/server";

type InBody = { token?: string };

export async function POST(req: Request): Promise<NextResponse> {
  // 1) Validate body
  const body = (await req.json().catch(() => null)) as InBody | null;
  if (!body?.token || typeof body.token !== "string") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  // 2) Resolve backend base
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!API_BASE) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 500 }
    );
  }

  // 3) Proxy with timeout
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/auth/verification/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: body.token }),
      cache: "no-store",
      signal: ac.signal,
    });
  } catch (e: unknown) {
    clearTimeout(t);
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Upstream timeout"
        : "Failed to reach API";
    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(t);
  }

  // 4) Read upstream body safely (JSON or text or empty)
  const ct = resp.headers.get("content-type") || "";
  let data: any = null;

  if (ct.includes("application/json")) {
    data = await resp.json().catch(() => null);
  } else {
    const text = await resp.text().catch(() => "");
    data = text ? { message: text } : null;
  }

  // 5) Normalize errors for the client
  if (!resp.ok) {
    // If FastAPI returned structured errors, pass them through
    const message =
      data?.detail || data?.message || `Verify failed (${resp.status})`;

    // map well-known reasons to keep your UI logic simple
    const detail =
      data?.detail && typeof data.detail === "string"
        ? data.detail
        : undefined;

    return NextResponse.json(
      { message, ...(detail ? { detail } : {}) },
      { status: resp.status }
    );
  }

  // 6) Success: return whatever upstream gave, or a minimal ok
  // FastAPI: { ok: true, emailVerified: true }
  return NextResponse.json(data ?? { ok: true }, { status: 200 });
}
