'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { loginSchema } from '@/lib/schemas';
import { z } from 'zod';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setSubmitting(true);
    try {
      const profile = await login(values.email, values.password);
      toast.success('Welcome back!');
      router.push(profile?.role === 'ADMIN' ? '/admin' : '/');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Log in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          className="w-full rounded-none font-semibold tracking-wide uppercase"
          size="lg"
          disabled={submitting}
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
