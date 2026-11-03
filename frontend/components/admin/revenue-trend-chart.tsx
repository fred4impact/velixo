'use client';

import { useState } from 'react';
import { DashboardRevenueTrendPoint } from '@/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

// lime-600 — validated against the white chart surface (lightness, chroma, contrast all pass).
const BAR_COLOR = '#65a30d';

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function RevenueTrendChart({ data }: { data: DashboardRevenueTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div>
      <div className="flex h-32 items-end gap-2 border-b border-border">
        {data.map((point, i) => {
          const isHovered = hoverIndex === i;
          const heightPct = point.total > 0 ? Math.max((point.total / max) * 100, 4) : 0;

          return (
            <div
              key={point.date}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {isHovered && (
                <div className="absolute -top-9 z-10 whitespace-nowrap bg-foreground px-2 py-1 text-xs font-semibold text-background">
                  {formatPrice(point.total.toFixed(2))}
                </div>
              )}
              <div
                className={cn(
                  'w-full max-w-8 rounded-t-[4px] transition-opacity',
                  isHovered && 'opacity-80',
                )}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: point.total > 0 ? BAR_COLOR : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-2">
        {data.map((point) => (
          <span
            key={point.date}
            className="flex-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {parseLocalDate(point.date).toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}
