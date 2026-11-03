'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { usersService } from '@/services/users.service';

interface ProfileForm {
  firstName: string;
  lastName: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  const onSubmit = async (values: ProfileForm) => {
    setSubmitting(true);
    try {
      await usersService.updateProfile(values);
      await refreshUser();
      toast.success('Profile updated');
    } catch {
      toast.error('Could not update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input value={user?.email} disabled />
        </div>
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...register('firstName')} />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...register('lastName')} />
        </div>
        <Button type="submit" className="rounded-none font-semibold tracking-wide uppercase" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
