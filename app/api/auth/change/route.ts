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

interface PasswordChangeBody {
  current_password: string;
  new_password: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_API_URL is not set" },
        { status: 500 }
      );
    }

    // Read JSON body from the client
    const body = (await req.json().catch(() => null)) as
      | PasswordChangeBody
      | null;

    if (
      !body ||
      typeof body !== "object" ||
      typeof body.current_password !== "string" ||
      typeof body.new_password !== "string"
    ) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
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
    const text = await resp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    return NextResponse.json(data, { status: resp.status });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unexpected error while changing password";
    return NextResponse.json({ message }, { status: 500 });
  }
}
