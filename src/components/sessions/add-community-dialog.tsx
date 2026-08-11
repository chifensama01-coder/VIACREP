"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

type Subdivision = {
  id: string;
  name: string;
  division: string;
  region: string;
  label: string;
};

type CreateResult =
  | { ok: true; data: { id: string; name: string; label: string } }
  | { ok: false; error: string };

/**
 * Communities not already in the workbook get typed in here. The brief puts
 * this behind the coordinator role, so the entry form only offers it to them.
 */
export function AddCommunityDialog({
  open,
  initialName,
  subdivisions,
  onCancel,
  onCreated,
  onError,
  createAction,
}: {
  open: boolean;
  initialName: string;
  subdivisions: Subdivision[];
  onCancel: () => void;
  onCreated: (created: { id: string; name: string; label: string }) => void;
  onError: (message: string) => void;
  createAction: (input: {
    name: string;
    subdivisionId: string;
  }) => Promise<CreateResult>;
}) {
  const [name, setName] = React.useState(initialName);
  const [subdivisionId, setSubdivisionId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Reset the fields each time the dialog is opened with a new query, during
  // render rather than in an effect so the stale values are never painted.
  const [session, setSession] = React.useState(() => `${open}:${initialName}`);
  const currentSession = `${open}:${initialName}`;
  if (open && session !== currentSession) {
    setSession(currentSession);
    setName(initialName);
    setSubdivisionId("");
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const byRegion = subdivisions.reduce<Record<string, Subdivision[]>>(
    (acc, s) => {
      (acc[s.region] ??= []).push(s);
      return acc;
    },
    {},
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !subdivisionId) return;
    setSaving(true);
    const result = await createAction({ name: name.trim(), subdivisionId });
    setSaving(false);
    if (result.ok) onCreated(result.data);
    else onError(result.error);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <form
        onSubmit={submit}
        className="animate-toast-in relative w-full max-w-md rounded-card bg-white p-6 shadow-pop"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-gold-50 text-gold-700">
          <MapPinPlus className="size-5" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink-900">
          Add a community
        </h2>
        <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
          It joins the list for everyone. Pick the division and subdivision it
          belongs to so reports group it correctly.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Community name" required htmlFor="new-community-name">
            <Input
              id="new-community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mile 14"
              autoFocus
            />
          </Field>

          <Field
            label="Division — Subdivision"
            required
            htmlFor="new-community-sub"
          >
            <Select
              id="new-community-sub"
              value={subdivisionId}
              onChange={(e) => setSubdivisionId(e.target.value)}
            >
              <option value="">Choose…</option>
              {Object.entries(byRegion).map(([region, items]) => (
                <optgroup key={region} label={region}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!name.trim() || !subdivisionId}
          >
            Add community
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
