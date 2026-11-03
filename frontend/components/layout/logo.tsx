import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-black tracking-tighter uppercase', className)}>
      Velix
      <span
        aria-hidden="true"
        className="relative mx-[0.03em] inline-block h-[0.62em] w-[0.62em] translate-y-[0.06em] rounded-full bg-lime-400"
      />
    </span>
  );
}
