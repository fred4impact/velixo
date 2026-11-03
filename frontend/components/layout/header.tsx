'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Heart, User as UserIcon, LogOut, Package, LayoutDashboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCategories } from '@/hooks/use-categories';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist();
  const { data: categories } = useCategories();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const itemCount = cart?.cart.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const wishlistCount = wishlist?.items.length ?? 0;
  const topLevelCategories = (categories ?? []).filter((c) => !c.parentId).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="bg-foreground py-2 text-center text-[11px] font-semibold tracking-[0.15em] text-background uppercase">
        Free shipping on every order &middot; No minimum
      </div>

      <div className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0">
            <Logo className="text-xl" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <Link
              href="/products?sortBy=createdAt&sortOrder=desc"
              className="text-sm font-semibold tracking-wide uppercase text-foreground/80 transition-colors hover:text-foreground"
            >
              New arrivals
            </Link>
            {topLevelCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?categoryId=${category.id}`}
                className="text-sm font-semibold tracking-wide uppercase text-foreground/80 transition-colors hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/products"
              className="text-sm font-semibold tracking-wide uppercase text-foreground/80 transition-colors hover:text-foreground"
            >
              Shop all
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <div className="hidden items-center sm:flex">
              {searchOpen ? (
                <form
                  className="flex items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    router.push(`/products?search=${encodeURIComponent(search)}`);
                    setSearchOpen(false);
                  }}
                >
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products"
                    className="h-9 w-48 border-b border-foreground bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close search"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </div>

            <Button variant="ghost" size="icon" asChild aria-label="Wishlist">
              <Link href="/wishlist" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild aria-label="Cart">
              <Link href="/cart" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    {itemCount}
                  </span>
                )}
              </Link>
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-semibold">
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <Package className="mr-2 h-4 w-4" /> My orders
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                className={cn('ml-1 rounded-none border-foreground font-semibold uppercase tracking-wide')}
                asChild
              >
                <Link href="/login">Log in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
