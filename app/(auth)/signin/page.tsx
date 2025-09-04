'use client';

declare global {
  interface Window {
    google?: typeof google;
  }
}

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle as LoaderCircleIcon,
  MailPlus,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/common/icons';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';

/* ──────────────────────────────────────────────────────────────────────────
   Small helpers (types + safe JSON)
   -------------------------------------------------------------------------- */

type Busy = 'idle' | 'email' | 'google';

type ApiOk = {
  access_token?: string;
  token_type?: string;
};

type ApiErr = {
  code?: string;
  detail?: string;
  message?: string;
  email?: string;
};

type ApiJson = Partial<ApiOk & ApiErr>;
type JsonObject = Record<string, unknown>;

function isJsonObject(v: unknown): v is JsonObject {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

async function safeJson(resp: Response): Promise<ApiJson> {
  try {
    const parsed = (await resp.json()) as unknown;
    if (isJsonObject(parsed)) return parsed as ApiJson;
    return {};
  } catch {
    return {};
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   GIS helpers (FedCM-safe) + OAuth popup fallback
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
    // One Tap (ID token)
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

    // OAuth Code (popup) fallback
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
    onIssue?.('Google Sign-In not initialized yet.');
    return;
  }
  if (promptInFlight) {
    onIssue?.('Sign-in already in progress.');
    return;
  }

  promptInFlight = true;
  cancelPrompt = () => {
    try {
      g.accounts.id.cancel();
    } catch {
      /* noop */
    }
    promptInFlight = false;
    cancelPrompt = null;
  };

  g.accounts.id.prompt((n: google.accounts.id.PromptMomentNotification) => {
    if (n.isNotDisplayed?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      const reason = n.getNotDisplayedReason?.() || 'unknown';
      // Fallback to popup when One Tap can't show
      if (reason === 'opt_out_or_no_session' || reason === 'unknown_reason') {
        try {
          codeClient?.requestCode();
          return;
        } catch {
          onIssue?.(`Google popup could not start. (${reason})`);
          return;
        }
      }
      onIssue?.(`Prompt not displayed: ${reason}`);
    }
    if (n.isSkippedMoment?.()) {
      promptInFlight = false;
      cancelPrompt = null;
      onIssue?.(`Prompt skipped: ${n.getSkippedReason?.() || 'unknown'}`);
    }
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
      className={`fixed left-0 top-0 z-[90] h-0.5 w-full overflow-hidden transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'
        }`}
    >
      <div className="h-full w-[40%] translate-x-[-100%] animate-[activity_1.4s_ease-in-out_infinite] bg-primary" />
      <style jsx>{`
        @keyframes activity {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
}

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

export default function SignInPage() {
  const router = useRouter();
  const { login, loginWithGoogleIdToken, status } = useAuth();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
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
              const data = await safeJson(resp);
              if (!resp.ok || !data.access_token) {
                throw new Error(data.detail || data.message || 'Google sign-in failed');
              }
              localStorage.setItem('lf_token', data.access_token);
              const ok = await loginWithGoogleIdToken(idToken);
              if (!ok) throw new Error('Google sign-in failed');
              router.replace('/');
              router.refresh();
              // Fallback hard reload if the soft nav doesn’t work
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.location.replace('/');
                }
              }, 400);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Google sign-in failed');
            } finally {
              setBusy('idle');
            }
          },
          // OAuth popup path (code)
          async (code: string) => {
            try {
              const resp = await fetch('/api/auth/callback/google-oauth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
              });
              const data = await safeJson(resp);
              if (!resp.ok || !data.access_token) {
                throw new Error(data.detail || data.message || 'Google popup sign-in failed');
              }
              localStorage.setItem('lf_token', data.access_token);
              router.replace('/');
              router.refresh();
            } catch (e: unknown) {
              setError(
                e instanceof Error ? e.message : 'Google popup sign-in failed',
              );
            } finally {
              setBusy('idle');
            }
          },
        );
        if (alive) setGsiReady(true);
      } catch (e: unknown) {
        if (alive) {
          setError(
            e instanceof Error ? e.message : 'Failed to initialize Google Sign-In',
          );
        }
      }
    })();
    return () => {
      alive = false;
      if (cancelPrompt) cancelPrompt();
    };
  }, [googleClientId, loginWithGoogleIdToken, router]);

  // Email/password submit
  const onSubmit = async (values: SigninSchemaType) => {
    setBusy('email');
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    try {
      // Try provider (keeps app state consistent)
      const ok = await login(values.email, values.password);
      if (ok) return;

      // Fallback call for richer error info (e.g. EMAIL_UNVERIFIED)
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      if (resp.ok) {
        const data = await safeJson(resp);
        if (data.access_token) {
          localStorage.setItem('lf_token', data.access_token);
          router.replace('/');
          router.refresh();
          return;
        }
      } else {
        const err = await safeJson(resp);

        // Normalize "email not verified"
        const raw = String(
          err.code ?? err.detail ?? err.message ?? '',
        ).toUpperCase();
        const isUnverified =
          resp.status === 403 &&
          (raw === 'EMAIL_UNVERIFIED' || raw === 'EMAIL_NOT_VERIFIED');

        if (isUnverified) {
          setUnverifiedEmail(err.email || values.email);
          setError('Your email isn’t verified yet.');
          return;
        }

        if (resp.status === 401) {
          setError('Invalid credentials. Please try again.');
          return;
        }

        setError(err.message || 'Sign-in failed. Please try again.');
        return;
      }

      setError('Invalid credentials. Please try again.');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setBusy('idle');
    }
  };

  // Resend verification (for unverified accounts)
  const resend = async () => {
    if (!unverifiedEmail || resending) return;
    setResending(true);
    setNotice(null);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      try {
        localStorage.setItem('pendingEmail', unverifiedEmail);
      } catch {
        /* ignore */
      }
      setNotice(`We’ve sent a new verification link to ${unverifiedEmail}.`);
    } catch {
      setError('Could not resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Google sign-in
  const handleGoogleSignIn = () => {
    setError(null);
    if (!googleClientId) {
      setError('Google sign-in not configured.');
      return;
    }
    if (!gsiReady) {
      setError('Still preparing Google Sign-In. Try again in a moment.');
      return;
    }
    setBusy('google');
    promptOnce((msg) => {
      setBusy('idle');
      if (msg) setError(msg);
    });
  };

  return (
    <>
      <TopActivityBar active={isBusy} />
      <PageLock active={isBusy} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative block w-full space-y-5"
        >
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
              disabled={busy === 'email' || !gsiReady}
              aria-disabled={busy === 'email' || !gsiReady}
              aria-busy={busy === 'google'}
              className={[
                'relative justify-center ring-1 ring-border',
                busy === 'google' ? 'pointer-events-none ring-primary/40 bg-primary/5' : '',
              ].join(' ')}
            >
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

          {/* Error / Notice */}
          {error && (
            <Alert
              variant="destructive"
              className="border-destructive/30 bg-destructive/15 text-destructive-foreground"
              onClose={() => setError(null)}
            >
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <div className="w-full">
                <AlertTitle className="font-semibold text-center">
                  {error}
                </AlertTitle>

                {unverifiedEmail && (
                  <div className="mt-3 flex justify-center">
                    <Button
                      onClick={resend}
                      disabled={resending}
                      variant="outline"
                      className="gap-2 w-full max-w-[360px] justify-center border-white/20 bg-white/10 text-white hover:bg-white/15"
                      size="lg"
                    >
                      {resending ? <InlineSpinner /> : <MailPlus className="h-4 w-4" />}
                      {resending ? 'Sending…' : 'Resend verification email'}
                    </Button>
                  </div>
                )}
              </div>
            </Alert>
          )}

          {notice && (
            <p className="text-sm text-muted-foreground text-center">
              {notice}{' '}
              {unverifiedEmail && (
                <Link
                  href={`/verify?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  Verify now
                </Link>
              )}
            </p>
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
                  <label
                    htmlFor="remember-me"
                    className="text-sm leading-none text-muted-foreground"
                  >
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
            <Link
              href="/signup"
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
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
