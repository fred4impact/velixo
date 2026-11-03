import { useQuery } from '@tanstack/react-query';
import { categoriesService } from '@/services/catalog.service';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.list,
    staleTime: 5 * 60 * 1000,
  });
}
