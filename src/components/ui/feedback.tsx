"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Toasts                                                                      */
/* -------------------------------------------------------------------------- */

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; title: string; detail?: string };

const ToastContext = React.createContext<{
  toast: (tone: ToastTone, title: string, detail?: string) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(1);

  const toast = React.useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, tone, title, detail }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        tone === "error" ? 6500 : 4000,
      );
    },
    [],
  );

  const dismiss = (id: number) =>
    setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_ICONS: Record<ToastTone, React.ElementType> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};
const TOAST_TONES: Record<ToastTone, string> = {
  success: "text-success-500",
  error: "text-danger-500",
  info: "text-blue-600",
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = TOAST_ICONS[toast.tone];
  return (
    <div className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-tile bg-ink-900 py-3 pr-3 pl-3.5 text-white shadow-pop">
      <Icon className={cn("mt-0.5 size-[18px] shrink-0", TOAST_TONES[toast.tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.detail && (
          <p className="mt-0.5 text-[13px] leading-5 text-ink-300">{toast.detail}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-m-1 rounded p-1 text-ink-400 transition-colors hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirm dialog                                                              */
/* -------------------------------------------------------------------------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // `open` only ever becomes true from a click, so by the time we portal there
  // is always a document — no mounted flag needed.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="animate-toast-in relative w-full max-w-md rounded-card bg-white p-6 shadow-pop"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-danger-50">
          <AlertTriangle className="size-5 text-danger-500" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink-900">{title}</h2>
        <div className="mt-1.5 text-sm leading-6 text-ink-600">{body}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="h-10 rounded-control bg-white px-4 text-sm font-medium text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-10 rounded-control bg-danger-500 px-4 text-sm font-medium text-white transition-colors hover:bg-danger-700 disabled:opacity-60"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
