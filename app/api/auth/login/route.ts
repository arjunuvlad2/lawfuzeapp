// app/api/auth/login/route.ts
/**
 * POST /api/auth/login
 * Forwards { email, password } to FastAPI /auth/login
 * Returns { access_token, token_type } on success.
 */
import { NextResponse } from "next/server";

interface LoginBody {
  email: string;
  password: string;
}

function pickString(obj: unknown, key: string): string | undefined {
  if (obj && typeof obj === "object") {
    const v = (obj as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const raw = (await req.json().catch(() => null)) as Partial<LoginBody> | null;
    if (
      !raw ||
      typeof raw.email !== "string" ||
      typeof raw.password !== "string"
    ) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    // Resolve API base
    const API_BASE =
      (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!API_BASE) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_API_URL is not set" },
        { status: 500 }
      );
    }

    // Proxy to FastAPI
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: raw.email, password: raw.password }),
    });

    const text = await resp.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text || "Unexpected response" };
    }

    if (!resp.ok) {
      const message =
        pickString(parsed, "detail") ??
        pickString(parsed, "message") ??
        `Login failed (${resp.status})`;
      return NextResponse.json({ message }, { status: resp.status });
    }

    // Success: forward JSON as-is (e.g., { access_token, token_type })
    return NextResponse.json(parsed, { status: 200 });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
