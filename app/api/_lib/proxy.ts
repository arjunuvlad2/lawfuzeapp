import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function apiBase(): string {
  const base = process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error('AUTH_API_URL / NEXT_PUBLIC_API_URL not set');
  return base.replace(/\/+$/, '');
}

type ProxyOpts = {
  req: NextRequest;
  path: string;
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  extraHeaders?: Record<string, string>;
};

export async function proxyJson({
  req,
  path,
  method = 'GET',
  body,
  extraHeaders,
}: ProxyOpts): Promise<NextResponse> {
  const upstream = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // 🔁 forward the browser cookies to FastAPI (so /auth/me works)
      Cookie: req.headers.get('cookie') ?? '',
      ...(extraHeaders ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const text = await upstream.text();

  let data: unknown;
  let isJson = false;
  try {
    data = JSON.parse(text);
    isJson = true;
  } catch {
    data = text; // plain text or empty
  }

  // Build response and **copy Set-Cookie** headers back to the browser
  const res = new NextResponse(
    typeof data === 'string' ? data : JSON.stringify(data),
    {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ??
          (isJson ? 'application/json' : 'text/plain; charset=utf-8'),
      },
    },
  );

  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'set-cookie') res.headers.append('set-cookie', value);
    if (k === 'cache-control') res.headers.set('cache-control', value);
  });

  return res;
}
