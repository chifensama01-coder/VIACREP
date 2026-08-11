import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

type Tone = "neutral" | "blue" | "gold" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200/70",
  blue: "bg-blue-50 text-blue-800 ring-blue-200/70",
  gold: "bg-gold-50 text-gold-800 ring-gold-200/70",
  success: "bg-success-50 text-success-700 ring-success-500/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-500/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/20",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs " +
          "font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Initials chip for facilitators — six deterministic tints so a face is stable. */
const AVATAR_TINTS = [
  "bg-blue-100 text-blue-800",
  "bg-gold-100 text-gold-800",
  "bg-blue-600 text-white",
  "bg-ink-800 text-white",
  "bg-gold-600 text-white",
  "bg-blue-200 text-blue-900",
];

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tint = AVATAR_TINTS[hash % AVATAR_TINTS.length];
  const dims = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-[11px]",
  }[size];

  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold " +
          "ring-2 ring-white select-none",
        dims,
        tint,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 3,
  size = "sm",
}: {
  names: string[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  if (names.length === 0) {
    return <span className="text-[13px] text-ink-300">—</span>;
  }
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span
          title={names.slice(max).join(", ")}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-ink-100 " +
              "font-semibold text-ink-600 ring-2 ring-white",
            size === "xs" ? "size-5 text-[9px]" : size === "sm" ? "size-6 text-[10px]" : "size-8 text-[11px]",
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
