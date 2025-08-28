import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function apiBase() {
  const base = process.env.AUTH_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error('AUTH_API_URL / NEXT_PUBLIC_API_URL not set');
  return base.replace(/\/+$/, '');
}

type ProxyOpts = {
  req: NextRequest;
  path: string;
  method?: 'GET'|'POST'|'DELETE';
  body?: any;
  extraHeaders?: Record<string, string>;
};

export async function proxyJson({ req, path, method='GET', body, extraHeaders }: ProxyOpts) {
  const upstream = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // 🔁 forward the browser cookies to FastAPI (so /auth/me works)
      Cookie: req.headers.get('cookie') ?? '',
      ...(extraHeaders ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const text = await upstream.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = text; }

  // Build response and **copy Set-Cookie** headers back to the browser
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
    if (key.toLowerCase() === 'set-cookie') res.headers.append('Set-Cookie', value);
    if (key.toLowerCase() === 'cache-control') res.headers.set('Cache-Control', value);
  });

  return res;
}
