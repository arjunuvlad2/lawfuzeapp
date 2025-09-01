/**
 * POST /api/auth/login
 * Forwards { email, password } to FastAPI /auth/login
 * Normalizes common errors (e.g. EMAIL_UNVERIFIED).
 */
import { NextResponse } from 'next/server';

interface LoginBody {
  email: string;
  password: string;
}

type JsonObject = Record<string, unknown>;

function isJsonObject(v: unknown): v is JsonObject {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parseJsonSafe(text: string): JsonObject | null {
  try {
    const v = text ? (JSON.parse(text) as unknown) : null;
    return isJsonObject(v) ? v : null;
  } catch {
    return null;
  }
}

function pickString(obj: unknown, key: string): string | undefined {
  if (isJsonObject(obj)) {
    const v = obj[key];
    if (typeof v === 'string') return v;
  }
  return undefined;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => null)) as Partial<LoginBody> | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ message: 'Invalid body' }, { status: 400 });
    }

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
    if (!API_BASE) {
      return NextResponse.json(
        { message: 'NEXT_PUBLIC_API_URL is not set' },
        { status: 500 },
      );
    }

    const upstream = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    const ct = upstream.headers.get('content-type') || '';
    const raw = await upstream.text();
    const data = ct.includes('application/json') ? parseJsonSafe(raw) : null;

    const detail = pickString(data, 'detail') ?? pickString(data, 'message');

    // ── Friendly normalization ──────────────────────────────────────────────
    if (!upstream.ok) {
      // Unverified email (support both spellings)
      const isUnverified =
        upstream.status === 403 &&
        (detail === 'EMAIL_UNVERIFIED' || detail === 'EMAIL_NOT_VERIFIED');

      if (isUnverified) {
        return NextResponse.json(
          {
            code: 'EMAIL_UNVERIFIED',
            email: body.email,
            message: 'Email not verified',
          },
          { status: 403 },
        );
      }

      // Invalid credentials
      if (upstream.status === 401) {
        return NextResponse.json(
          { message: 'Invalid credentials. Please try again.' },
          { status: 401 },
        );
      }

      // Fallback
      return NextResponse.json(
        { message: detail || `Login failed (${upstream.status})` },
        { status: upstream.status },
      );
    }

    // Success: pass-through JSON (still parsed safely)
    const okJson = data ?? parseJsonSafe(raw) ?? {};
    return NextResponse.json(okJson, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
