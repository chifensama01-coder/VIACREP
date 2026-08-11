"use client";

import * as React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-control bg-white text-[15px] text-ink-900 placeholder:text-ink-400 " +
  "ring-1 ring-inset ring-ink-200 transition-shadow duration-150 " +
  "hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

/* Roomy on phones — staff type these in from paper, often one-handed. */
const HEIGHT = "h-12 px-3.5 sm:h-11";

export function Label({
  className,
  required,
  hint,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        className={cn("text-[13px] font-medium text-ink-700", className)}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-danger-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && <span className="text-2xs text-ink-400">{hint}</span>}
    </div>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-danger-500">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        CONTROL,
        HEIGHT,
        invalid && "ring-danger-500 focus:ring-danger-500",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, "min-h-28 resize-y px-3.5 py-3 leading-6", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL,
          HEIGHT,
          "cursor-pointer appearance-none pr-10",
          invalid && "ring-danger-500 focus:ring-danger-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
    </div>
  );
});
