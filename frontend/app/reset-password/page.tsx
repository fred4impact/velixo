'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError('This link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="text-muted-foreground">Missing reset token.</p>
        <Button asChild className="mt-6 rounded-none font-semibold tracking-wide uppercase">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Set a new password</h1>
      {done ? (
        <p className="text-muted-foreground">Password updated. Redirecting to login...</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full rounded-none font-semibold tracking-wide uppercase"
            size="lg"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save new password'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
