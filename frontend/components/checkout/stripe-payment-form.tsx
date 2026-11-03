'use client';

import { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { getStripe } from '@/lib/stripe';

function PaymentFormInner({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setSubmitting(false);
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={!stripe || submitting}>
        {submitting ? 'Processing...' : 'Pay now'}
      </Button>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret }}>
      <PaymentFormInner onSuccess={onSuccess} />
    </Elements>
  );
}
