'use client';

/**
 * Sign-up Page (LawFuze)
 * ----------------------
 * - Email/password + reCAPTCHA -> /api/auth/signup
 * - Google Sign-Up/In via GIS (FedCM-friendly) -> /api/auth/callback/google
 */

declare global {
  interface Window {
    google?: typeof google;
  }
}

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle as LoaderCircleIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/common/icons';
import { RecaptchaPopover } from '@/components/common/recaptcha-popover';
import { getSignupSchema, SignupSchemaType } from '../forms/signup-schema';

/* ──────────────────────────────────────────────────────────────────────────
   Google Identity Services (One Tap + OAuth popup fallback) — FedCM-safe
   -------------------------------------------------------------------------- */

let gisInited = false;
let promptInFlight = false;
let cancelPrompt: (() => void) | null = null;
let codeClient: google.accounts.oauth2.CodeClient | null = null;

function loadGsi(): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    const w = window as Window & { google?: typeof google };
    if (w.google?.accounts?.id) return resolve(w.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () =>
      resolve((window as Window & { google?: typeof google }).google as typeof google);
    s.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(s);
  });
}

async function initGsi(
  clientId: string,
  onCredential: (idToken: string) => void,
  onCodeExchange: (code: string) => Promise<void>,
) {
  const googleObj = await loadGsi();
  if (!gisInited) {
    // One Tap (ID token path)
    googleObj.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: google.accounts.id.CredentialResponse) => {
        promptInFlight = false;
        cancelPrompt = null;
        if (resp?.credential) onCredential(resp.credential);
      },
      use_fedcm_for_prompt: true,
      itp_support: true,
      cancel_on_tap_outside: true,
      auto_select: false,
    });

    // OAuth Code (popup) — fallback when One Tap can’t display
    codeClient = googleObj.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: async (resp: google.accounts.oauth2.CodeResponse) => {
        if (resp?.code) await onCodeExchange(resp.code);
      },
    });

    gisInited = true;
  }
  return googleObj;
}

function promptOnce(onIssue?: (msg: string) => void) {
  const g = window.google;
  if (!g?.accounts?.id) {
    onIssue?.('Google Sign-In not initialized.');
    return;
  }
  if (promptInFlight) {
    onIssue?.('Sign-in already in progress.');
    return;
  }

  promptInFlight = true;

  cancelPrompt = () => {
    try { g.accounts.id.cancel(); } catch { /* noop */ }
    promptInFlight = false;
    cancelPrompt = null;
  };

  g.accounts.id.prompt((n: google.accounts.id.PromptMomentNotification) => {
    // One Tap could not display → fallback to popup
    if (n.isNotDisplayed?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      const reason = n.getNotDisplayedReason?.() || 'unknown';
      if (reason === 'opt_out_or_no_session' || reason === 'unknown_reason') {
        try { codeClient?.requestCode(); return; }
        catch { onIssue?.(`Google popup could not start. (${reason})`); return; }
      }
      onIssue?.(`Prompt not displayed: ${reason}`);
    }

    if (n.isSkippedMoment?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      onIssue?.(`Prompt skipped: ${n.getSkippedReason?.() || 'unknown'}`);
    }
    // success path handled in initialize.callback
  });
}

function cleanupGsi() {
  if (cancelPrompt) cancelPrompt();
}

/* ──────────────────────────────────────────────────────────────────────────
   Small UI helpers
   -------------------------------------------------------------------------- */
function InlineSpinner() {
  return <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />;
}

function TopActivityBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={`fixed left-0 top-0 z-[90] h-0.5 w-full overflow-hidden transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'
        }`}
    >
      <div className="h-full w-[40%] translate-x-[-100%] animate-[activity_1.4s_ease-in-out_infinite] bg-primary" />
      <style jsx>{`
        @keyframes activity {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

// Soft veil that blocks clicks while any auth is busy
function PageLock({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] bg-background/35 backdrop-blur-[1px] pointer-events-auto"
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

type Busy = 'idle' | 'email' | 'google';

export default function Page() {
  const router = useRouter();
  const { loginWithGoogleIdToken, status } = useAuth();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [gsiReady, setGsiReady] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [showRecaptcha, setShowRecaptcha] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isBusy = busy !== 'idle';

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(getSignupSchema()),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      accept: false,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
      router.refresh();
    }
  }, [status, router]);

  // Initialize GIS once and register handlers
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!googleClientId) return;
        await initGsi(
          googleClientId,
          // ID token path
          async (idToken: string) => {
            try {
              const resp = await fetch('/api/auth/callback/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken }),
              });
              const data: { access_token?: string; detail?: string; message?: string } =
                await resp.json().catch(() => ({} as Record<string, unknown>));
              if (!resp.ok || !data?.access_token) {
                throw new Error(data?.detail || data?.message || 'Google sign-in failed');
              }
              localStorage.setItem('lf_token', data.access_token);
              const ok = await loginWithGoogleIdToken(idToken);
              if (!ok) throw new Error('Google sign-in failed');
              router.replace('/');
              router.refresh();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Google sign-in failed');
            } finally {
              setBusy('idle');
            }
          },
          // OAuth popup path (authorization code)
          async (code: string) => {
            try {
              const resp = await fetch('/api/auth/callback/google-oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
              });
              const data: { access_token?: string; detail?: string; message?: string } =
                await resp.json().catch(() => ({} as Record<string, unknown>));
              if (!resp.ok || !data?.access_token) {
                throw new Error(data?.detail || data?.message || 'Google popup sign-in failed');
              }
              localStorage.setItem('lf_token', data.access_token);
              router.replace('/'); router.refresh();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Google popup sign-in failed');
            } finally {
              setBusy('idle');
            }
          }
        );
        if (alive) setGsiReady(true);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to initialize Google Sign-In');
      }
    })();

    // Optional: clearer UX for blocked FedCM
    const rej = (ev: PromiseRejectionEvent) => {
      if (String(ev.reason)?.includes('IdentityCredentialError')) {
        setError('Browser blocked Google Sign-In (FedCM). Use HTTPS/localhost or allow 3rd-party sign-in.');
      }
    };
    window.addEventListener('unhandledrejection', rej);

    return () => {
      alive = false;
      cleanupGsi();
      window.removeEventListener('unhandledrejection', rej);
    };
  }, [googleClientId, loginWithGoogleIdToken, router]);

  /* Email + reCAPTCHA submit */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = await form.trigger();
    if (!ok) return;

    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      await handleVerifiedSubmit('dev-bypass'); // DEV ONLY
      return;
    }
    setShowRecaptcha(true);
  };

  const handleVerifiedSubmit = async (token: string) => {
    try {
      setBusy('email');
      setError(null);
      setShowRecaptcha(false);

      const values = form.getValues();
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-recaptcha-token': token },
        body: JSON.stringify(values),
      });

      const data: { message?: string } =
        await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        setError((data as { message?: string })?.message || 'Sign up failed');
        return;
      }

      // ✅ After successful signup: remember email and go to /verify
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingEmail', values.email);
      }
      const next = `/verify?email=${encodeURIComponent(values.email)}`;

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  /* Google button click → One Tap, fallback to popup */
  const handleGoogleSignup = () => {
    setError(null);
    if (!googleClientId) {
      setError('Google sign-in not configured.');
      return;
    }
    if (!gsiReady) {
      setError('Preparing Google Sign-In. Try again in a moment.');
      return;
    }
    setBusy('google');
    promptOnce((msg) => {
      setBusy('idle');
      setError(msg);
    });
  };

 

  return (
    <Suspense>
      <TopActivityBar active={isBusy} />
      <PageLock active={isBusy} />

      <Form {...form}>
        <form onSubmit={handleSubmit} className="block w-full space-y-5">
          {/* Header */}
          <div className="space-y-1.5 pb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign up for LawFuze
            </h1>
          </div>

          {/* Google sign-up/in */}
          <div className="flex flex-col gap-2.5">
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignup}
              disabled={busy === 'email' || !gsiReady}
              aria-disabled={busy === 'email' || !gsiReady}
              aria-busy={busy === 'google'}
              className={[
                'relative justify-center ring-1 ring-border',
                busy === 'google' ? 'pointer-events-none ring-primary/40 bg-primary/5' : '',
              ].join(' ')}
              title={!gsiReady ? 'Preparing Google Sign-In…' : 'Sign up with Google'}
            >
              {busy === 'google' && (
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
                  <span className="absolute inset-y-0 -left-full w-1/2 translate-x-0 animate-[shimmer_1.4s_ease_infinite] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <style jsx>{`
                    @keyframes shimmer {
                      0% { transform: translateX(0%); }
                      100% { transform: translateX(200%); }
                    }
                  `}</style>
                </span>
              )}

              {busy === 'google' ? (
                <InlineSpinner />
              ) : (
                <Icons.googleColorful className="size-5! opacity-100!" aria-hidden />
              )}
              <span className="ms-2">
                {busy === 'google' ? 'Connecting to Google…' : (gsiReady ? 'Sign up with Google' : 'Preparing…')}
              </span>
            </Button>

            {busy === 'google' ? (
              <div className="flex items-center justify-between text-sm">
                <p className="text-foreground">Waiting for Google One Tap…</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    cancelPrompt?.();
                    setBusy('idle');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="relative py-1.5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" onClose={() => setError(null)}>
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your Name" disabled={busy === 'email'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Your email" autoComplete="email" disabled={busy === 'email'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <Input
                    placeholder="Your password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={busy === 'email'}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    disabled={busy === 'email'}
                  >
                    {passwordVisible ? (
                      <EyeOff className="text-muted-foreground" />
                    ) : (
                      <Eye className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <div className="relative">
                  <Input
                    type={passwordConfirmationVisible ? 'text' : 'password'}
                    {...field}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={busy === 'email'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    onClick={() => setPasswordConfirmationVisible(!passwordConfirmationVisible)}
                    className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                    aria-label={
                      passwordConfirmationVisible
                        ? 'Hide password confirmation'
                        : 'Show password confirmation'
                    }
                    disabled={busy === 'email'}
                  >
                    {passwordConfirmationVisible ? (
                      <EyeOff className="text-muted-foreground" />
                    ) : (
                      <Eye className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Accept */}
          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="accept"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="accept"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                        disabled={busy === 'email'}
                      />
                      <label htmlFor="accept" className="text-sm leading-none text-muted-foreground">
                        I agree to the
                      </label>
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        className="-ms-0.5 text-sm font-semibold text-foreground hover:text-primary"
                      >
                        Privacy Policy
                      </Link>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit (email flow w/ reCAPTCHA) */}
          <div className="flex flex-col gap-2.5">
            <RecaptchaPopover
              open={showRecaptcha}
              onOpenChange={(open) => {
                if (!open) setShowRecaptcha(false);
              }}
              onVerify={handleVerifiedSubmit}
              trigger={
                <Button
                  type="submit"
                  disabled={busy === 'email'}
                  aria-busy={busy === 'email'}
                  className={busy === 'email' ? 'pointer-events-none' : ''}
                >
                  {busy === 'email' ? <InlineSpinner /> : null}
                  <span className={busy === 'email' ? 'ms-2' : ''}>Continue</span>
                </Button>
              }
            />
          </div>

          {/* Footer links */}
          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/signin" className="text-sm font-semibold text-foreground hover:text-primary">
              Sign In
            </Link>
          </div>
        </form>
      </Form>
    </Suspense>
  );
}
