import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white shadow-tile hover:bg-blue-700 active:bg-blue-800 " +
    "disabled:bg-blue-300",
  gold:
    "bg-gold-500 text-gold-900 shadow-tile hover:bg-gold-400 active:bg-gold-600 " +
    "disabled:bg-gold-200",
  secondary:
    "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 shadow-tile " +
    "hover:bg-ink-50 hover:ring-ink-300 active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900 active:bg-ink-200/70",
  danger:
    "bg-danger-500 text-white shadow-tile hover:bg-danger-700 active:bg-danger-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[8px]",
  md: "h-10 px-4 text-sm gap-2 rounded-control",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-control",
};

const BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-medium " +
  "transition-[background-color,box-shadow,transform,color] duration-150 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
