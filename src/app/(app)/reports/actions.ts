"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeScope, getOrganization, reportTitleFor, saveNarrative } from "@/lib/narrative";
import { scopeFromSearchParams } from "@/lib/scope";

const schema = z.object({
  query: z.string(),
  objectives: z.string().max(8000),
  methodology: z.string().max(8000),
  lessonsLearnt: z.string().max(8000),
  challenges: z.string().max(8000),
  recommendations: z.string().max(8000),
  preparedBy: z.string().max(160).nullable(),
  preparedDesignation: z.string().max(160).nullable(),
  approvedBy: z.string().max(160).nullable(),
  approvedDesignation: z.string().max(160).nullable(),
  status: z.enum(["DRAFT", "FINAL"]),
});

export type SaveNarrativeInput = z.infer<typeof schema>;

export async function saveNarrativeAction(
  input: SaveNarrativeInput,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  const user = await requireUser();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { query, status, ...text } = parsed.data;
  const scope = scopeFromSearchParams(new URLSearchParams(query));

  try {
    await getOrganization();
    const filterLabels = await describeScope(scope);
    const title = reportTitleFor(scope, filterLabels);

    await saveNarrative({
      scope,
      title,
      narrative: text,
      status,
      userId: user.id,
    });

    revalidatePath("/reports");
    revalidatePath("/reports/build");
    return { ok: true, title };
  } catch (error) {
    console.error("saveNarrativeAction", error);
    return { ok: false, error: "Could not save the narrative. Please try again." };
  }
}
