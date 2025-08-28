'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircle as LoaderCircleIcon } from 'lucide-react';

import { apiFetch } from '@/lib/api';

import {
  ChangePasswordSchemaType,
  getChangePasswordSchema,
} from '../forms/change-password-schema';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || null;

  // UI + flow state
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] = useState(false);

  // RHF + Zod
  const form = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(getChangePasswordSchema()),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  // 1) Verify the reset token as soon as we land on this page
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setError(null);
        setVerifyingToken(true);

        if (!token) {
          setError('No reset token provided.');
          setIsValidToken(false);
          return;
        }

        const response = await apiFetch('/api/auth/reset-password-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setIsValidToken(true);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || 'Invalid or expired token.');
          setIsValidToken(false);
        }
      } catch {
        setError('Unable to verify the reset token.');
        setIsValidToken(false);
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  // 2) Submit: change password using the token
  const onSubmit = async (values: ChangePasswordSchemaType) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend expects the reset token + the new password
        body: JSON.stringify({ token, newPassword: values.newPassword }),
      });

      if (response.ok) {
        setSuccessMessage('Password reset successful! Redirecting to sign in…');
        // Small delay so users can read the message; then go to signin.
        // You can pick up ?reset=success there to show a toast.
        setTimeout(() => router.replace('/signin?reset=success'), 1200);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Password reset failed.');
      }
    } catch {
      setError('An error occurred while resetting the password.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="block w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </div>

        {/* Token verification spinner */}
        {verifyingToken && (
          <Alert>
            <AlertIcon>
              <LoaderCircleIcon className="size-4 animate-spin" />
            </AlertIcon>
            <AlertTitle>Verifying…</AlertTitle>
          </Alert>
        )}

        {/* Error state */}
        {error && !verifyingToken && (
          <div className="text-center space-y-6">
            <Alert variant="destructive">
              <AlertIcon>
                <AlertCircle />
              </AlertIcon>
              <AlertTitle>{error}</AlertTitle>
            </Alert>
            <Button asChild>
              <Link href="/signin" className="text-primary">
                Go back to Sign In
              </Link>
            </Button>
          </div>
        )}

        {/* Success state */}
        {successMessage && (
          <Alert>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        {/* Main form (only when token valid, not verifying, not already success) */}
        {isValidToken && !successMessage && !verifyingToken && (
          <>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={passwordVisible ? 'text' : 'password'}
                        placeholder="Enter new password"
                        disabled={isProcessing}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      onClick={() => setPasswordVisible((v) => !v)}
                      className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={passwordConfirmationVisible ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        disabled={isProcessing}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      onClick={() => setPasswordConfirmationVisible((v) => !v)}
                      className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                      aria-label={
                        passwordConfirmationVisible
                          ? 'Hide password confirmation'
                          : 'Show password confirmation'
                      }
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

            <Button type="submit" disabled={isProcessing} className="w-full">
              {isProcessing && <LoaderCircleIcon className="size-4 animate-spin" />}
              Reset Password
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
