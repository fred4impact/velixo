'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await authService.forgotPassword(email).catch(() => undefined);
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Reset your password</h1>
      {sent ? (
        <p className="text-muted-foreground">
          If an account exists for {email}, a password reset link has been sent.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-none font-semibold tracking-wide uppercase"
            size="lg"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
    </div>
  );
}
