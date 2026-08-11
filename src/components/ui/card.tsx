import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface shadow-card ring-1 ring-ink-100/70",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6 sm:pt-6",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-ink-900">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-[13px] leading-5 text-ink-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}

/** A hairline divider that bleeds to the card edges. */
export function CardDivider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-ink-100", className)} />;
}
