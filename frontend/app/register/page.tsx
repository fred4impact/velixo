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
import { registerSchema } from '@/lib/schemas';
import { z } from 'zod';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setSubmitting(true);
    try {
      await registerUser(values);
      toast.success('Account created! Check your email to verify your address.');
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Create an account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
          </div>
        </div>
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
        <Button
          type="submit"
          className="w-full rounded-none font-semibold tracking-wide uppercase"
          size="lg"
          disabled={submitting}
        >
          {submitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
