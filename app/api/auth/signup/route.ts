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

interface SignupBody {
  name: string;
  email: string;
  password: string;
  passwordConfirmation?: string; // client-only
  accept?: boolean;              // client-only
}

function parseJsonSafe<T = unknown>(text: string): T | string {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text; // return as plain text when not valid JSON
  }
}

function pickString(obj: unknown, key: string): string | undefined {
  if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1) Read form JSON sent by your signup page
    const body = (await req.json().catch(() => null)) as SignupBody | null;
    if (
      !body ||
      typeof body.name !== 'string' ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string'
    ) {
      return NextResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    // 2) Optional reCAPTCHA header
    const recaptchaToken = req.headers.get('x-recaptcha-token') ?? '';

    // 3) Map to backend contract
    const payload = {
      full_name: body.name,
      email: body.email,
      password: body.password,
    };

    // 4) Resolve backend base URL
    const base = (process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(
      /\/+$/,
      '',
    );
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
    const parsed = parseJsonSafe<Record<string, unknown>>(text);

    // 7) Build a NextResponse and **COPY ALL Set-Cookie** headers
    const res = new NextResponse(
      typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
      {
        status: upstream.status,
        headers: {
          'Content-Type':
            upstream.headers.get('content-type') ??
            (typeof parsed === 'string' ? 'text/plain; charset=utf-8' : 'application/json'),
        },
      },
    );

    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie') res.headers.append('set-cookie', value);
      if (k === 'cache-control') res.headers.set('cache-control', value);
    });

    // 8) Normalize error payload for the client
    if (!upstream.ok) {
      const message =
        (typeof parsed === 'object' && (pickString(parsed, 'detail') ?? pickString(parsed, 'message'))) ||
        `Signup failed with ${upstream.status}`;
      return NextResponse.json({ message }, { status: upstream.status, headers: res.headers });
    }

    return res; // typically { user_id, org_id }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
