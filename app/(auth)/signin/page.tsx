'use client';

declare global {
  interface Window {
    google?: any;
  }
}

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircle as LoaderCircleIcon } from 'lucide-react';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/common/icons';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

/* ──────────────────────────────────────────────────────────────────────────
   GIS helpers (FedCM-safe) + OAuth popup fallback
   -------------------------------------------------------------------------- */
let gisInited = false;
let promptInFlight = false;
let cancelPrompt: (() => void) | null = null;
let codeClient: any | null = null;

function loadGsi(): Promise<typeof window.google> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.accounts?.id) return resolve(w.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(s);
  });
}

async function initGsi(
  clientId: string,
  onCredential: (idToken: string) => void,
  onCodeExchange: (code: string) => Promise<void>,
) {
  const google = await loadGsi();
  if (!gisInited) {
    // One Tap (ID token)
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: any) => {
        promptInFlight = false;
        cancelPrompt = null;
        if (resp?.credential) onCredential(resp.credential);
      },
      use_fedcm_for_prompt: true,
      itp_support: true,
      cancel_on_tap_outside: true,
      auto_select: false,
    });

    // OAuth Code (popup) fallback
    codeClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: async (resp: any) => {
        if (resp?.code) await onCodeExchange(resp.code);
      },
    });

    gisInited = true;
  }
  return google;
}

function promptOnce(onIssue?: (msg: string) => void) {
  const google = (window as any).google;
  if (!google?.accounts?.id) {
    onIssue?.('Google Sign-In not initialized yet.');
    return;
  }
  if (promptInFlight) {
    onIssue?.('Sign-in already in progress.');
    return;
  }

  promptInFlight = true;

  cancelPrompt = () => {
    try { google.accounts.id.cancel(); } catch {}
    promptInFlight = false;
    cancelPrompt = null;
  };

  google.accounts.id.prompt((n: any) => {
    if (n.isNotDisplayed?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      const reason = n.getNotDisplayedReason?.() || 'unknown';
      // Fallback to popup when One Tap can't show (no session / opted out)
      if (reason === 'opt_out_or_no_session' || reason === 'unknown_reason') {
        try { codeClient?.requestCode(); return; }
        catch { onIssue?.(`Google popup could not start. (${reason})`); return; }
      }
      onIssue?.(`Prompt not displayed: ${reason}`);
    }

    if (n.isSkippedMoment?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      const reason = n.getSkippedReason?.() || 'unknown';
      onIssue?.(`Prompt skipped: ${reason}`);
    }
    // success handled via initialize.callback
  });
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
      className={`fixed left-0 top-0 z-[90] h-0.5 w-full overflow-hidden transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
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

// ⛔ Page click-lock (soft veil) while any auth is busy
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

export default function SignInPage() {
  const router = useRouter();
  const { login, loginWithGoogleIdToken, status } = useAuth();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isBusy = busy !== 'idle';

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: { email: '', password: '', rememberMe: false },
    mode: 'onSubmit',
  });

  // Navigate once authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
      router.refresh();
    }
  }, [status, router]);

  // GIS init
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
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok || !data?.access_token) throw new Error(data?.detail || data?.message || 'Google sign-in failed');
              localStorage.setItem('lf_token', data.access_token);
              const ok = await loginWithGoogleIdToken(idToken);
              if (!ok) throw new Error('Google sign-in failed');
              router.replace('/'); router.refresh();
            } catch (e: any) {
              setError(e?.message || 'Google sign-in failed');
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
              const data = await resp.json().catch(() => ({}));
              if (!resp.ok || !data?.access_token) throw new Error(data?.detail || data?.message || 'Google popup sign-in failed');
              localStorage.setItem('lf_token', data.access_token);
              router.replace('/'); router.refresh();
            } catch (e: any) {
              setError(e?.message || 'Google popup sign-in failed');
            } finally {
              setBusy('idle');
            }
          }
        );

        if (alive) setGsiReady(true);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to initialize Google Sign-In');
      }
    })();
    return () => { alive = false; if (cancelPrompt) cancelPrompt(); };
  }, [googleClientId, loginWithGoogleIdToken, router]);

  // Email/password submit
  const onSubmit = async (values: SigninSchemaType) => {
    setBusy('email');
    setError(null);
    try {
      const ok = await login(values.email, values.password);
      if (!ok) setError('Invalid credentials. Please try again.');
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  // Google sign-in
  const handleGoogleSignIn = () => {
    setError(null);
    if (!googleClientId) return setError('Google sign-in not configured.');
    if (!gsiReady) return setError('Still preparing Google Sign-In. Try again in a moment.');
    setBusy('google');
    promptOnce((msg) => {
      setBusy('idle');
      setError(msg);
    });
  };

  return (
    <>
      <TopActivityBar active={isBusy} />
      <PageLock active={isBusy} />

      <Form {...form}>
        {/* elevate the card if you want it clickable while locked: add z-[80] here */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="relative block w-full space-y-5">
          {/* Header */}
          <div className="space-y-1.5 pb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to LawFuze
            </h1>
          </div>

          {/* Google */}
          <div className="flex flex-col gap-2.5">
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              // keep contrast by not disabling during google busy
              disabled={busy === 'email' || !gsiReady}
              aria-disabled={busy === 'email' || !gsiReady}
              aria-busy={busy === 'google'}
              className={[
                'relative justify-center ring-1 ring-border',
                busy === 'google' ? 'pointer-events-none ring-primary/40 bg-primary/5' : '',
              ].join(' ')}
            >
              {/* shimmer progress when google busy */}
              {busy === 'google' && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
                >
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
                {busy === 'google'
                  ? 'Connecting to Google…'
                  : gsiReady
                  ? 'Sign in with Google'
                  : 'Preparing…'}
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

          {/* Error */}
          {error && (
            <Alert variant="destructive" onClose={() => setError(null)}>
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isBusy && busy !== 'google'}
                    aria-disabled={isBusy && busy !== 'google'}
                    aria-invalid={!!form.formState.errors.email}
                    {...field}
                  />
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
                <div className="flex justify-between items-center gap-2.5">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/reset-password"
                    className="text-sm font-semibold text-foreground hover:text-primary"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <div className="relative">
                  <Input
                    placeholder="••••••••"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isBusy && busy !== 'google'}
                    aria-disabled={isBusy && busy !== 'google'}
                    aria-invalid={!!form.formState.errors.password}
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
                    disabled={isBusy && busy !== 'google'}
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

          {/* Remember me */}
          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <>
                  <Checkbox
                    id="remember-me"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(!!c)}
                    disabled={isBusy && busy !== 'google'}
                  />
                  <label htmlFor="remember-me" className="text-sm leading-none text-muted-foreground">
                    Remember me
                  </label>
                </>
              )}
            />
          </div>

          {/* Email Sign In */}
          <div className="flex flex-col gap-2.5">
            <Button
              type="submit"
              disabled={busy === 'email'}
              aria-busy={busy === 'email'}
              className={busy === 'email' ? 'pointer-events-none' : ''}
            >
              {busy === 'email' ? <InlineSpinner /> : null}
              <span className={busy === 'email' ? 'ms-2' : ''}>Sign In</span>
            </Button>
          </div>

          {/* Footer */}
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-sm font-semibold text-foreground hover:text-primary">
              Sign Up
            </Link>
          </p>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            Secure by default · 2FA · UK/EU data options
          </p>
        </form>
      </Form>
    </>
  );
}
