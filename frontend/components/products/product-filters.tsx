'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category } from '@/types';

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <form
      className="mb-8 flex flex-wrap items-end gap-4 border-b border-border pb-6"
      onSubmit={(e) => {
        e.preventDefault();
        updateParam('search', search || null);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-56 rounded-none pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Category
        </label>
        <Select
          value={searchParams.get('categoryId') ?? 'all'}
          onValueChange={(value) => updateParam('categoryId', value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-10 w-[180px] rounded-none">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Sort by
        </label>
        <Select
          value={`${searchParams.get('sortBy') ?? 'createdAt'}:${searchParams.get('sortOrder') ?? 'desc'}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split(':');
            const params = new URLSearchParams(searchParams.toString());
            params.set('sortBy', sortBy);
            params.set('sortOrder', sortOrder);
            router.push(`/products?${params.toString()}`);
          }}
        >
          <SelectTrigger className="h-10 w-[180px] rounded-none">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest</SelectItem>
            <SelectItem value="price:asc">Price: Low to High</SelectItem>
            <SelectItem value="price:desc">Price: High to Low</SelectItem>
            <SelectItem value="name:asc">Name: A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        variant="outline"
        className="h-10 rounded-none border-foreground font-semibold tracking-wide uppercase"
      >
        Apply
      </Button>
    </form>
  );
}
