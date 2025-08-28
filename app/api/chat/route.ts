import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // fast & stream-friendly

const apiKey = process.env.OPENAI_API_KEY ?? '';
if (!apiKey) {
  // Note: this will not throw during import on edge, but it's useful for local/dev.
  // The POST handler below still checks before using the client.
  // eslint-disable-next-line no-console
  console.warn('OPENAI_API_KEY is not set');
}

const client = new OpenAI({ apiKey });

type ChatBody = {
  messages: unknown;
  model?: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = (await req.json().catch(() => null)) as ChatBody | null;

    if (!parsed || !Array.isArray(parsed.messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    // Create a streaming completion
    const stream = await client.chat.completions.create({
      model: parsed.model ?? 'gpt-5',
      temperature: 0.2,
      messages: parsed.messages as unknown[], // already validated as array
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of stream) {
            const delta = part.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err: unknown) {
          controller.error(
            err instanceof Error ? err : new Error('Stream error')
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
