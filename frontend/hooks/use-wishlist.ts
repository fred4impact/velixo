import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { wishlistService } from '@/services/wishlist.service';
import { useAuth } from '@/lib/auth-context';

export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistService.get,
    enabled: !!user,
  });
}

export function useAddWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistService.addItem(productId),
    onSuccess: (data) => {
      queryClient.setQueryData(['wishlist'], data);
      toast.success('Added to wishlist');
    },
    onError: () => toast.error('Could not add to wishlist'),
  });
}

export function useRemoveWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistService.removeItem(productId),
    onSuccess: (data) => queryClient.setQueryData(['wishlist'], data),
    onError: () => toast.error('Could not remove item'),
  });
}

export function useMoveWishlistItemToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistService.moveToCart(productId),
    onSuccess: (data) => {
      queryClient.setQueryData(['wishlist'], data.wishlist);
      queryClient.setQueryData(['cart'], { cart: data.cart, totals: data.totals });
      toast.success('Moved to cart');
    },
    onError: () => toast.error('Could not move item to cart'),
  });
}
