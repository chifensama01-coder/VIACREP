"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FileDown,
  FileText,
  History,
  PenLine,
  Save,
  Sparkle,
  Table2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { saveNarrativeAction } from "@/app/(app)/reports/actions";

export type NarrativeValues = {
  objectives: string;
  methodology: string;
  lessonsLearnt: string;
  challenges: string;
  recommendations: string;
  preparedBy: string;
  preparedDesignation: string;
  approvedBy: string;
  approvedDesignation: string;
};

const SECTIONS: {
  key: keyof NarrativeValues;
  number: number;
  label: string;
  hint: string;
}[] = [
  {
    key: "objectives",
    number: 7,
    label: "Objectives",
    hint: "What the sessions set out to achieve.",
  },
  {
    key: "methodology",
    number: 8,
    label: "Methodology",
    hint: "How the sessions were run.",
  },
  {
    key: "lessonsLearnt",
    number: 9,
    label: "Lessons Learnt & Feedback",
    hint: "What worked, and what participants said.",
  },
  {
    key: "challenges",
    number: 10,
    label: "Challenges",
    hint: "What got in the way this period.",
  },
  {
    key: "recommendations",
    number: 12,
    label: "Recommendations",
    hint: "What should change next period.",
  },
];

export function NarrativeEditor({
  query,
  initial,
  origin,
  carriedFrom,
  status: initialStatus,
  exportBase,
  title,
}: {
  query: string;
  initial: NarrativeValues;
  origin: "saved" | "carried-forward" | "defaults";
  carriedFrom: string | null;
  status: "DRAFT" | "FINAL" | null;
  exportBase: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [status, setStatus] = React.useState(initialStatus ?? "DRAFT");

  const set = (key: keyof NarrativeValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  async function save(nextStatus: "DRAFT" | "FINAL") {
    setSaving(true);
    const result = await saveNarrativeAction({
      query,
      ...values,
      preparedBy: values.preparedBy || null,
      preparedDesignation: values.preparedDesignation || null,
      approvedBy: values.approvedBy || null,
      approvedDesignation: values.approvedDesignation || null,
      status: nextStatus,
    });
    setSaving(false);

    if (!result.ok) return toast("error", result.error);
    setDirty(false);
    setStatus(nextStatus);
    toast(
      "success",
      nextStatus === "FINAL" ? "Narrative marked final" : "Draft saved",
      result.title,
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Narrative sections"
          description="The words are yours; the numbers are computed. One bullet per line."
          action={
            <Badge tone={status === "FINAL" ? "success" : "neutral"}>
              {status === "FINAL" ? "Final" : "Draft"}
            </Badge>
          }
        />

        <div className="px-5 pb-2 sm:px-6">
          <OriginNotice origin={origin} carriedFrom={carriedFrom} />
        </div>

        <div className="space-y-5 px-5 pb-6 sm:px-6">
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label
                  htmlFor={section.key}
                  className="flex items-baseline gap-2 text-[13px] font-medium text-ink-700"
                >
                  <span className="text-2xs font-semibold text-blue-600 tabular">
                    {section.number}
                  </span>
                  {section.label}
                </label>
                <span className="text-2xs text-ink-400">{section.hint}</span>
              </div>
              <AutoTextarea
                id={section.key}
                value={values[section.key]}
                onChange={(e) => set(section.key, e.target.value)}
              />
              <p className="mt-1 text-2xs text-ink-400">
                {values[section.key].split("\n").filter((l) => l.trim()).length}{" "}
                bullet
                {values[section.key].split("\n").filter((l) => l.trim()).length === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Signature block"
          description="Printed at the end of every report."
        />
        <div className="grid gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-6">
          <Field label="Prepared by" htmlFor="preparedBy">
            <Input
              id="preparedBy"
              value={values.preparedBy}
              onChange={(e) => set("preparedBy", e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Designation" htmlFor="preparedDesignation">
            <Input
              id="preparedDesignation"
              value={values.preparedDesignation}
              onChange={(e) => set("preparedDesignation", e.target.value)}
              placeholder="e.g. Programme Coordinator"
            />
          </Field>
          <Field label="Approved by" htmlFor="approvedBy">
            <Input
              id="approvedBy"
              value={values.approvedBy}
              onChange={(e) => set("approvedBy", e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Designation" htmlFor="approvedDesignation">
            <Input
              id="approvedDesignation"
              value={values.approvedDesignation}
              onChange={(e) => set("approvedDesignation", e.target.value)}
              placeholder="e.g. Executive Director"
            />
          </Field>
        </div>
      </Card>

      {/* Save + export bar */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-ink-100 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-card lg:border lg:border-ink-100 lg:px-5 lg:py-4 lg:shadow-card lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-[13px] text-ink-500 lg:block">
            {dirty ? (
              <span className="flex items-center gap-1.5 text-gold-700">
                <PenLine className="size-3.5" aria-hidden />
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-success-500" aria-hidden />
                Saved
              </span>
            )}
          </p>
          <div className="flex flex-1 flex-wrap gap-2 lg:flex-none">
            <Button
              variant="secondary"
              onClick={() => save("DRAFT")}
              loading={saving}
              className="flex-1 lg:flex-none"
            >
              {!saving && <Save className="size-4" aria-hidden />}
              Save draft
            </Button>
            <Button
              variant="gold"
              onClick={() => save("FINAL")}
              loading={saving}
              className="flex-1 lg:flex-none"
            >
              {!saving && <Check className="size-4" aria-hidden />}
              Mark final
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
          {/*
            PDF goes through the print page rather than the server renderer:
            the document is identical, and it needs no Chrome on the host — so
            it behaves the same locally and on a serverless deployment.
          */}
          <ExportLink
            href={`/print/report?${query}&print=1`}
            target="_blank"
            icon={<FileText className="size-4" aria-hidden />}
            label="PDF"
            note="On the letterhead"
            dirty={dirty}
          />
          <ExportLink
            href={`${exportBase}/docx?${query}`}
            icon={<FileDown className="size-4" aria-hidden />}
            label="Word"
            note=".docx"
            dirty={dirty}
          />
          <ExportLink
            href={`${exportBase}/excel?${query}`}
            icon={<Table2 className="size-4" aria-hidden />}
            label="Excel"
            note="Data + summaries"
            dirty={dirty}
          />
        </div>
        {dirty && (
          <p className="mt-2 text-2xs text-gold-700">
            Save first — exports use the last saved narrative.
          </p>
        )}
      </div>

      <p className="sr-only">{title}</p>
    </div>
  );
}

/**
 * Narrative sections are bullet lists of unpredictable length. A fixed `rows`
 * either clips the text or leaves a hole, so the box tracks its own content.
 */
function AutoTextarea({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [value]);

  return (
    <Textarea
      id={id}
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      className="resize-none overflow-hidden text-sm leading-6"
    />
  );
}

function ExportLink({
  href,
  icon,
  label,
  note,
  dirty,
  target,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  note: string;
  dirty: boolean;
  target?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener" : undefined}
      className={cn(
        "group flex flex-1 items-center gap-2.5 rounded-tile bg-white px-3 py-2.5 ring-1 ring-ink-200",
        "transition-all duration-150 hover:shadow-tile hover:ring-blue-300",
        dirty && "opacity-70",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-900">
          {label}
        </span>
        <span className="block truncate text-2xs text-ink-400">{note}</span>
      </span>
    </a>
  );
}

function OriginNotice({
  origin,
  carriedFrom,
}: {
  origin: "saved" | "carried-forward" | "defaults";
  carriedFrom: string | null;
}) {
  if (origin === "saved") return null;

  const carried = origin === "carried-forward";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-tile px-3.5 py-2.5 text-[13px] leading-5 ring-1 ring-inset",
        carried
          ? "bg-blue-50 text-blue-900 ring-blue-200/70"
          : "bg-gold-50 text-gold-900 ring-gold-200/70",
      )}
    >
      {carried ? (
        <History className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
      ) : (
        <Sparkle className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
      )}
      <p>
        {carried ? (
          <>
            Starting from{" "}
            <span className="font-medium">{carriedFrom}</span>. Edit anything
            that changed — nothing is saved until you press save.
          </>
        ) : (
          <>
            Starting from the organisation defaults. Once you save this period,
            the next one will start from your words instead.
          </>
        )}
      </p>
    </div>
  );
}

