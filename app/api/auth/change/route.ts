// app/api/auth/password/change/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/password/change
 * Proxies to FastAPI /auth/password/change, forwarding the Authorization header.
 *
 * Expect body:
 *   { current_password: string, new_password: string }
 *
 * NOTE:
 * - The client (browser) must include `Authorization: Bearer <token>` when calling
 *   this adapter (since server routes can't read localStorage).
 */
export async function POST(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL!;
    if (!apiBase) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_API_URL is not set" },
        { status: 500 }
      );
    }

    // Read JSON body from the client
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Invalid body" },
        { status: 400 }
      );
    }

    // Forward the bearer token exactly as received from the client
    const auth = req.headers.get("authorization") || "";

    // Proxy the request to FastAPI
    const resp = await fetch(`${apiBase}/auth/password/change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Important: pass through Authorization so backend can decode JWT
        Authorization: auth,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    // Pass FastAPI's response (json + status) through
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
