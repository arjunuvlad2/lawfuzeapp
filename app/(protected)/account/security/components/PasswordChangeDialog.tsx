'use client';

import * as React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, LoaderCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

/**
 * Client-side validation:
 * - all fields >= 8 chars
 * - new_password === confirm_password
 */
const schema = z.object({
  current_password: z.string().min(8, 'Current password must be at least 8 characters'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PasswordChangeDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { logout } = useAuth(); // ✅ use your provider’s logout (clears token & user)
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // eye toggles
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Read the JWT your app stores
      const token = typeof window !== 'undefined' ? localStorage.getItem('lf_token') : null;
      if (!token) {
        setError('You are not logged in.');
        return;
      }

      // ✅ Call your Next.js adapter which proxies to FastAPI
      const resp = await fetch('/api/auth/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // forward Bearer token
        },
        body: JSON.stringify({
          current_password: values.current_password,
          new_password: values.new_password,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setError(data?.detail || data?.message || 'Failed to change password');
        return;
      }

      // 🎉 Success UI
      setSuccess('Password changed successfully. You’ll be signed out…');
      form.reset();

      // 🔒 Security: log them out so old sessions can’t be used
      // (also good UX to force re-auth with the new password)
      setTimeout(() => {
        logout();        // clears lf_token + user
        router.replace('/signin'); // send to sign-in
      }, 1200); // short delay so they see the success message

    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  // When closing the dialog, clear transient state
  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setSuccess(null);
      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new one. You’ll use the new password next time you sign in.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertIcon><AlertCircle /></AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        {success && (
          <Alert className="mb-2">
            <AlertIcon>✓</AlertIcon>
            <AlertTitle>{success}</AlertTitle>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current password */}
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? <EyeOff className="text-muted-foreground" /> : <Eye className="text-muted-foreground" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New password */}
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                      onClick={() => setShowNew((v) => !v)}
                    >
                      {showNew ? <EyeOff className="text-muted-foreground" /> : <Eye className="text-muted-foreground" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm password */}
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      className="absolute end-0 top-1/2 -translate-y-1/2 h-7 w-7 me-1.5 bg-transparent!"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff className="text-muted-foreground" /> : <Eye className="text-muted-foreground" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
