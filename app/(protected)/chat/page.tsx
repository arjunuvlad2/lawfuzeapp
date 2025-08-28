'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Bot, Plus, User } from 'lucide-react';

// --- Types ---
type Role = 'user' | 'assistant' | 'system';
type Msg = { id: string; role: Role; content: string };
type Mode = 'landing' | 'chat';

// --- Page Component ---
export default function ChatReplicaPage() {
  const [mode, setMode] = useState<Mode>('landing');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [hasTyped, setHasTyped] = useState(false); // shows disclaimer

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Helpers ---
  function scrollToBottom(smooth = false) {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  // Autoscroll as content grows (chat mode only)
  useEffect(() => {
    if (mode === 'chat') scrollToBottom(true);
  }, [messages, showTyping, mode]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = '0px';
    const next = Math.min(240, el.scrollHeight);
    el.style.height = next + 'px';
  }, [input, mode]);

  // --- Send handler ---
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    // On first ever send, switch to chat mode
    if (mode === 'landing') setMode('chat');

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: Msg = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput('');
    setIsSending(true);
    setShowTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: 'user', content: text },
          ],
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to stream response.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        if (chunk) {
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantMsg.id ? { ...msg, content: msg.content + chunk } : msg))
          );
          if (mode === 'chat') scrollToBottom(true);
        }
      }
    } catch {
      setMessages((m) =>
        m.map((msg) => (msg.id === assistantMsg.id ? { ...msg, content: 'Sorry, something went wrong. Please try again.' } : msg))
      );
    } finally {
      setIsSending(false);
      setShowTyping(false);
      if (mode === 'chat') scrollToBottom(true);
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-header,0px))] w-full bg-[#0c0c0c]">
      <div className="flex flex-col w-full">
        <AnimatePresence initial={false} mode="wait">
          {mode === 'landing' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 overflow-y-auto"
            >
              {/* Centered hero */}
              <div className="px-4 pt-12 sm:pt-20">
                <div className="mx-auto max-w-[740px] text-center">
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    What’s on your agenda today?
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                    Ask a question, draft, analyse files, or type “/” to discover quick actions.
                  </p>
                </div>
              </div>

              {/* Composer for landing */}
              <div className="px-4 mt-8 sm:mt-12 pb-10 sm:pb-16">
                <form onSubmit={handleSend} className="mx-auto max-w-[740px]">
                  <div className="rounded-3xl bg-[#303030] ring-1 ring-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_8px_25px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                    <div className="flex items-end gap-2 p-2 sm:p-3">
                      <button
                        type="button"
                        title="Add"
                        className="p-2 rounded-xl hover:bg-white/5 transition text-muted-foreground"
                        onClick={() => alert('Add coming soon')}
                      >
                        <Plus className="h-5 w-5" />
                      </button>

                      <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => {
                          if (!hasTyped && e.target.value.length > 0) setHasTyped(true);
                          setInput(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder="Message ChatGPT…  Try /draft, /intake, /find"
                        className="flex-1 resize-none bg-transparent outline-none px-2 py-2 sm:px-3 sm:py-2 max-h-60 leading-relaxed placeholder:text-muted-foreground/70 text-base sm:text-[15px]"
                      />

                      <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        title="Send"
                        className="inline-flex items-center justify-center rounded-xl h-9 w-9 sm:h-10 sm:w-10 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
                      >
                        <ArrowUp className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 overflow-hidden"
            >
              {/* Thread area */}
              <div ref={scrollRef} className="h-full overflow-y-auto px-3 sm:px-4 md:px-6 pb-[160px]">
                <div className="mx-auto max-w-[840px] pt-6 space-y-4">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} role={m.role} content={m.content} />
                  ))}
                  {showTyping && <TypingIndicator />}
                </div>
              </div>

              

              {/* Bottom-fixed composer (centered) */}
              <div className="fixed inset-x-0 bottom-0 z-30 bg-transparent pb-[max(env(safe-area-inset-bottom),16px)]">
                <form onSubmit={handleSend} className="px-4 pt-2">
                  <div className="mx-auto max-w-[740px]">
                    <div className="rounded-3xl bg-[#303030] ring-1 ring-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_8px_25px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                      <div className="flex items-end gap-2 p-2 sm:p-3">
                        <button
                          type="button"
                          title="Add"
                          className="p-2 rounded-xl hover:bg-white/5 transition text-muted-foreground"
                          onClick={() => alert('Add coming soon')}
                        >
                          <Plus className="h-5 w-5" />
                        </button>

                        <textarea
                          ref={inputRef}
                          rows={1}
                          value={input}
                          onChange={(e) => {
                            if (!hasTyped && e.target.value.length > 0) setHasTyped(true);
                            setInput(e.target.value);
                          }}
                          onFocus={() => scrollToBottom(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          placeholder="Message Lawfuze  Try /draft, /intake, /find"
                          className="flex-1 resize-none bg-transparent outline-none px-2 py-2 sm:px-3 sm:py-2 max-h-48 leading-relaxed placeholder:text-muted-foreground/70 text-base sm:text-[15px]"
                        />

                        <button
                          type="submit"
                          disabled={isSending || !input.trim()}
                          title="Send"
                          className="inline-flex items-center justify-center rounded-xl h-9 w-9 sm:h-10 sm:w-10 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
                        >
                          <ArrowUp className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-[11px] text-muted-foreground">
                      AI responses may be inaccurate. Consider verifying critical details.
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Bubbles ---
function MessageBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
      className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="mt-1 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={[
          'max-w-[92%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-[#303030] text-foreground rounded-tl-sm',
        ].join(' ')}
      >
        <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap leading-relaxed">
          {content || '…'}
        </div>
      </div>
      {isUser && (
        <div className="mt-1 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
      className="flex items-center gap-2 text-muted-foreground"
    >
      <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
      <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0s]" />
      <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
      <span className="text-xs">LawFuze is typing…</span>
    </motion.div>
  );
}

// --- System prompt ---
const systemPrompt = `
You are LawFuze, a solicitor-focused AI assistant. Be concise, cite when appropriate,
and surface next-step actions (/draft, /intake, /find). Avoid definitive legal advice; suggest options.
`;
