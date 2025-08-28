import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const runtime = 'edge'; // fast & stream-friendly

const apiKey = process.env.OPENAI_API_KEY ?? '';
const client = new OpenAI({ apiKey });

type ChatBody = {
  messages: unknown;
  model?: string;
};

// Narrow unknown → ChatCompletionMessageParam
function isChatMessageParam(x: unknown): x is ChatCompletionMessageParam {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  // minimal structural checks: role + content
  const role = o.role;
  const content = o.content;
  const hasRole =
    role === 'system' ||
    role === 'user' ||
    role === 'assistant' ||
    role === 'tool' ||
    role === 'function';
  const hasContent =
    typeof content === 'string' ||
    Array.isArray(content); // SDK also accepts content parts array
  return !!hasRole && !!hasContent;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = (await req.json().catch(() => null)) as ChatBody | null;

    if (!parsed || !Array.isArray(parsed.messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    // Validate and narrow each message
    const msgsUnknown = parsed.messages as unknown[];
    if (!msgsUnknown.every(isChatMessageParam)) {
      return NextResponse.json(
        { error: 'messages contain invalid entries (role/content missing or malformed)' },
        { status: 400 }
      );
    }
    const messages: ChatCompletionMessageParam[] = msgsUnknown;

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
      messages, // now correctly typed
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
