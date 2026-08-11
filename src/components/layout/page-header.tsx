import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <header className={cn("mb-6 lg:mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1 text-[13px] text-ink-500"
        >
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && (
                <ChevronRight className="size-3.5 text-ink-300" aria-hidden />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded transition-colors hover:text-blue-700"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-700">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-2xs font-semibold tracking-[0.12em] text-blue-700 uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-ink-900 text-balance sm:text-[30px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
