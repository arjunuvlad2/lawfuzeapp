import { NextResponse } from "next/server";

type InBody = { email?: string };

export async function POST(req: Request): Promise<NextResponse> {
  // 1) Validate body
  const body = (await req.json().catch(() => null)) as InBody | null;
  if (!body?.email || typeof body.email !== "string") {
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

  try {
    const resp = await fetch(`${API_BASE}/auth/password/forgot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: body.email }),
      signal: ac.signal,
    });

    const data = await resp.json().catch(() => ({}));

    return NextResponse.json(
      {
        message:
          data?.message ??
          "If the email exists, we’ll send a reset link shortly.",
      },
      { status: resp.status || 202 }
    );
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "Upstream timeout" : "Network error";
    return NextResponse.json({ message }, { status: 504 });
  } finally {
    clearTimeout(t);
  }
}
