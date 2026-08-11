import * as React from "react";
import { cn } from "@/lib/utils";

/** A designed empty state: mark, one line, one action. Never a bare "No data". */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div className="relative">
        <div
          className="absolute -inset-3 rounded-full bg-blue-50"
          aria-hidden
        />
        <div className="relative flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Icon className="size-[22px]" aria-hidden />
        </div>
      </div>
      <p className="mt-6 text-[15px] font-semibold text-ink-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-ink-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden />;
}

/** Matches the stat-tile geometry so the page doesn't jump when data lands. */
export function StatTileSkeleton() {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-ink-100/70">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-4 h-9 w-32" />
      <Skeleton className="mt-4 h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-card bg-surface shadow-card ring-1 ring-ink-100/70">
      <div className="px-6 pt-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-56" />
      </div>
      <div className="flex items-end gap-2 px-6 pt-8 pb-6" style={{ height }}>
        {[52, 74, 45, 88, 63, 96, 58, 80].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-12" />
        </div>
      ))}
    </div>
  );
}
