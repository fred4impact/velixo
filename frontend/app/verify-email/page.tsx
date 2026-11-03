'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center">
      {status === 'loading' && <p>Verifying your email...</p>}
      {status === 'success' && (
        <>
          <h1 className="text-3xl font-black tracking-tight uppercase">Email verified</h1>
          <p className="mt-2 text-muted-foreground">Your email has been verified successfully.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-3xl font-black tracking-tight uppercase">Verification failed</h1>
          <p className="mt-2 text-muted-foreground">This link is invalid or has expired.</p>
        </>
      )}
      <Button asChild className="mt-8 rounded-none font-semibold tracking-wide uppercase" size="lg">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
