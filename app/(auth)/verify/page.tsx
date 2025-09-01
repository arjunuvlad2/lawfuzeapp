'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, MailPlus, MailCheck, MailX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '../../components/brand/Logo';

type Phase = 'verifying' | 'sending' | 'sent' | 'info' | 'success' | 'error';

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 relative mx-auto w-[min(92vw,820px)] rounded-3xl border border-white/10 bg-white/5 p-10 sm:p-12 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-10" />
      {children}
    </div>
  );
}

/* --- Optional fallback to avoid blank flash while searchParams hydrates --- */
function VerifyFallback() {
  return (
    <CardShell>
      <div className="mx-auto mb-8 flex items-center justify-center">
        <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 items-center justify-center">
          <div className="absolute inset-0 rounded-full ring-1 ring-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),rgba(255,255,255,0.05)_58%,rgba(0,0,0,0)_60%)]" />
          <Mail className="relative h-20 w-20 text-foreground/60" aria-hidden />
        </div>
      </div>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight">Loading…</h2>
        <p className="mt-3 text-base text-muted-foreground">Preparing your verification view.</p>
      </div>
    </CardShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // compute email once, synchronously, to set the initial phase correctly
  const email = useMemo(() => {
    const fromUrl = searchParams?.get('email') || undefined;
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') return localStorage.getItem('pendingEmail') ?? undefined;
    return undefined;
  }, [searchParams]);

  // set initial phase without showing "Verifying…" unless there's a token
  const [phase, setPhase] = useState<Phase>(() => {
    const token = searchParams?.get('token') || searchParams?.get('t');
    if (token) return 'verifying';
    if (email) return 'info';
    return 'error';
  });
  const [note, setNote] = useState<string>(() => {
    const token = searchParams?.get('token') || searchParams?.get('t');
    if (token) return 'Verifying your email…';
    if (email) return `We’ve emailed a verification link to ${email}.`;
    return 'Invalid or missing token.';
  });
  const [cooldown, setCooldown] = useState(0);

  const verify = useCallback(
    async (token: string) => {
      try {
        setPhase('verifying');
        setNote('Verifying your email…');
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setPhase('success');
          setNote('Your email has been verified. Redirecting…');
          if (typeof window !== 'undefined') localStorage.removeItem('pendingEmail');
          setTimeout(() => router.push('/signin'), 1200);
          return;
        }

        const data = await res.json().catch(() => ({} as any));
        const detail = typeof data?.detail === 'string' ? data.detail : undefined;

        if (detail === 'TOKEN_EXPIRED') {
          setPhase('error');
          setNote('Your verification link has expired. Request a new one below.');
        } else if (detail === 'TOKEN_INVALID') {
          setPhase('error');
          setNote('Invalid verification link. You can request a fresh one below.');
        } else {
          setPhase('error');
          setNote(data?.message || 'Verification failed. Please try again.');
        }
      } catch {
        setPhase('error');
        setNote('Network error while verifying. Please try again.');
      }
    },
    [router],
  );

  const resend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setPhase('sending');
    setCooldown(30);
    setNote('Sending a new verification email…');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setPhase('sent');
      setNote(`We’ve sent a new link to ${email}. Check your inbox.`);
    } catch {
      setPhase('error');
      setNote('Could not resend email. Please try again.');
      setCooldown(0);
    }
  }, [email, cooldown]);

  // cooldown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // kick off verification if token provided
  useEffect(() => {
    const token = searchParams?.get('token') || searchParams?.get('t');
    if (token) verify(token);
  }, [searchParams, verify]);

  // simple icon map
  const { Icon, tint } = (() => {
    switch (phase) {
      case 'success': return { Icon: MailCheck, tint: 'text-emerald-400' };
      case 'error':   return { Icon: MailX,    tint: 'text-red-400' };
      case 'info':
      case 'sending':
      case 'sent':    return { Icon: MailPlus, tint: 'text-cyan-400' };
      case 'verifying':
      default:        return { Icon: Mail,     tint: 'text-foreground/70' };
    }
  })();

  return (
    <div className="fixed inset-0 z-0 overflow-auto bg-gradient-to-b from-neutral-950 via-neutral-950 to-black">
      <div className="mx-auto flex min-h-[100svh] w-screen flex-col items-center justify-center px-4 py-10">
        <Logo />

        <CardShell>
          {/* Icon in a subtle radial disk */}
          <div className="mx-auto mb-8 flex items-center justify-center">
            <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 items-center justify-center">
              <div className="absolute inset-0 rounded-full ring-1 ring-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.14),rgba(255,255,255,0.05)_58%,rgba(0,0,0,0)_60%)]" />
              <Icon aria-hidden className={`relative h-15 w-15 sm:h-15 sm:w-15 md:h-20 md:w-20 ${tint}`} />
            </div>
          </div>

          {/* Copy */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              {phase === 'verifying' && 'Verifying your email'}
              {phase === 'sending'   && 'Sending verification'}
              {phase === 'sent'      && 'Check your inbox'}
              {phase === 'info'      && 'Check your inbox'}
              {phase === 'success'   && 'Verified'}
              {phase === 'error'     && 'We ran into a problem'}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{note}</p>
          </div>

          {/* Actions */}
          <div className="mx-auto mt-10 flex w-full max-w-2xl flex-wrap items-center justify-center gap-3">
            {(phase === 'verifying' || phase === 'sending') ? (
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
              </Button>
            ) : (
              <>
                <Button onClick={resend} disabled={!email || cooldown > 0} className="gap-2">
                  <MailPlus className="h-4 w-4" />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
                </Button>

                <Button asChild variant="outline" className="gap-2">
                  <Link href="/"><Home className="h-4 w-4" />Return to Site</Link>
                </Button>

                <Button asChild variant="ghost" className="gap-2">
                  <Link href="/signin"><ArrowLeft className="h-4 w-4" />Go back to Login</Link>
                </Button>
              </>
            )}
          </div>

          {email && (phase === 'info' || phase === 'sent') && (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Didn’t receive it? Check your spam folder or click <span className="font-medium">Resend</span>.
            </p>
          )}
        </CardShell>
      </div>
    </div>
  );
}
