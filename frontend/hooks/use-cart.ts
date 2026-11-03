import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService } from '@/services/cart.service';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: cartService.get,
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.addItem(productId, quantity),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.success('Added to cart');
    },
    onError: () => toast.error('Could not add item to cart'),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.updateItem(productId, quantity),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
    onError: () => toast.error('Could not update cart'),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => cartService.removeItem(productId),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
    onError: () => toast.error('Could not remove item'),
  });
}
