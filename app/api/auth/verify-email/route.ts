// app/api/auth/verify-email/route.ts
/**
 * POST /api/auth/verify-email
 * Proxies { token } to FastAPI /auth/verification/confirm.
 * Always returns JSON so the client can render friendly errors.
 */
import { NextResponse } from 'next/server';

type InBody = { token?: string };
type JsonObject = Record<string, unknown>;

function isJsonObject(v: unknown): v is JsonObject {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function pickString(obj: unknown, key: string): string | undefined {
  if (isJsonObject(obj)) {
    const v = obj[key];
    if (typeof v === 'string') return v;
  }
  return undefined;
}

async function readJsonIfAny(resp: Response): Promise<JsonObject | null> {
  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    const parsed = (await resp.json()) as unknown;
    return isJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  // 1) Validate body
  const body = (await req.json().catch(() => null)) as InBody | null;
  if (!body?.token || typeof body.token !== 'string') {
    return NextResponse.json({ message: 'Invalid body' }, { status: 400 });
  }

  // 2) Resolve backend base
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (!API_BASE) {
    return NextResponse.json(
      { message: 'NEXT_PUBLIC_API_URL is not set' },
      { status: 500 },
    );
  }

  // 3) Proxy with timeout
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 10_000);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/auth/verification/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: body.token }),
      cache: 'no-store',
      signal: ac.signal,
    });
  } catch (e: unknown) {
    clearTimeout(tid);
    const message =
      e instanceof Error && e.name === 'AbortError'
        ? 'Upstream timeout'
        : 'Failed to reach API';
    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(tid);
  }

  // 4) Read upstream body safely (JSON or text or empty)
  const data = await readJsonIfAny(upstream);
  let fallbackMessage: string | undefined;
  if (!data) {
    try {
      const text = await upstream.text();
      fallbackMessage = text || undefined;
    } catch {
      // ignore
    }
  }

  // 5) Normalize errors for the client
  if (!upstream.ok) {
    const detail = pickString(data, 'detail');
    const message =
      detail ||
      pickString(data, 'message') ||
      fallbackMessage ||
      `Verify failed (${upstream.status})`;

    return NextResponse.json(
      { message, ...(detail ? { detail } : {}) },
      { status: upstream.status },
    );
  }

  // 6) Success: return whatever upstream gave, or a minimal ok
  return NextResponse.json(data ?? { ok: true }, { status: 200 });
}
