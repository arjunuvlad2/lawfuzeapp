// app/api/auth/signup/route.ts
/**
 * Adapter API route (Next.js App Router)
 * --------------------------------------
 * Receives the signup form payload from your UI and forwards it to FastAPI.
 * - Maps { name, email, password } -> { full_name, email, password }
 * - (Optional) forwards 'x-recaptcha-token' header
 * - Returns backend JSON and **passes through Set-Cookie** if any.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // ensure Node runtime so Set-Cookie works
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1) Read form JSON sent by your signup page
    const body = (await req.json()) as {
      name: string;
      email: string;
      password: string;
      passwordConfirmation?: string; // client-only
      accept?: boolean;              // client-only
    };

    // 2) Optional reCAPTCHA header
    const recaptchaToken = req.headers.get('x-recaptcha-token') ?? '';

    // 3) Map to backend contract
    const payload = {
      full_name: body.name,
      email: body.email,
      password: body.password,
    };

    // 4) Resolve backend base URL
    const base =
      (process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
    if (!base) {
      return NextResponse.json(
        { message: 'AUTH_API_URL / NEXT_PUBLIC_API_URL is not set' },
        { status: 500 },
      );
    }

    // 5) Call FastAPI /auth/register
    const upstream = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // forward incoming cookies (harmless for register, but future-proof)
        Cookie: req.headers.get('cookie') ?? '',
        ...(recaptchaToken ? { 'x-recaptcha-token': recaptchaToken } : {}),
        'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '',
        'X-Forwarded-User-Agent': req.headers.get('user-agent') ?? '',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
    });

    // 6) Read body safely (could be JSON or text)
    const text = await upstream.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    // 7) Build a NextResponse and **COPY ALL Set-Cookie** headers
    const res = new NextResponse(
      typeof data === 'string' ? data : JSON.stringify(data),
      {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        },
      },
    );

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.headers.append('Set-Cookie', value);
      }
      if (key.toLowerCase() === 'cache-control') {
        res.headers.set('Cache-Control', value);
      }
    });

    // 8) Normalize error payload for the client
    if (!upstream.ok) {
      const message =
        (typeof data === 'object' && (data?.detail || data?.message)) ||
        `Signup failed with ${upstream.status}`;
      return NextResponse.json({ message }, { status: upstream.status, headers: res.headers });
    }

    return res; // typically { user_id, org_id }
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? 'Unexpected error' },
      { status: 500 },
    );
  }
}
