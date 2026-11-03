'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddCartItem } from '@/hooks/use-cart';

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useAddCartItem();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-md border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-sm">{quantity}</span>
        <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((q) => q + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button
        disabled={!inStock || addItem.isPending}
        onClick={() => addItem.mutate({ productId, quantity })}
        className="flex-1"
      >
        {inStock ? (addItem.isPending ? 'Adding...' : 'Add to cart') : 'Out of stock'}
      </Button>
    </div>
  );
}
