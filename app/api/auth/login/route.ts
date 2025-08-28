// app/api/auth/login/route.ts
/**
 * POST /api/auth/login
 * Forwards { email, password } to FastAPI /auth/login
 * Returns { access_token, token_type } on success.
 */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email: string; password: string };
    const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({} as any));
      const message =
        (err && (err.detail || err.message)) || `Login failed (${resp.status})`;
      return NextResponse.json({ message }, { status: resp.status });
    }

    const data = await resp.json(); // { access_token, token_type }
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
