import { notFound, redirect } from "next/navigation";
import { canAddCommunity, canEditSession, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionFormData } from "@/lib/sessions";
import { toDateInputValue } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SessionForm } from "@/components/sessions/session-form";
import { countKey, type Counts } from "@/lib/counts";

export const metadata = { title: "Edit session" };

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, data, session] = await Promise.all([
    requireUser(),
    getSessionFormData(),
    db.session.findUnique({
      where: { id },
      include: {
        counts: true,
        facilitators: { select: { name: true } },
        community: { select: { name: true } },
      },
    }),
  ]);

  if (!session) notFound();
  if (!canEditSession(user, session.createdById)) redirect("/sessions");

  const counts: Counts = {};
  for (const c of session.counts) {
    if (c.count > 0) counts[countKey(c.keyPopulationId, c.sex)] = c.count;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Edit entry"
        title={`Session in ${session.community.name}`}
        description="Correct anything that was mistyped. The totals recalculate as you go."
        breadcrumbs={[
          { label: "Sessions", href: "/sessions" },
          { label: "Edit" },
        ]}
      />
      <SessionForm
        data={data}
        sessionId={session.id}
        canAddCommunity={canAddCommunity(user)}
        initial={{
          date: toDateInputValue(session.date),
          communityId: session.communityId,
          projectId: session.projectId,
          thematicAreaId: session.thematicAreaId,
          ageGroupId: session.ageGroupId,
          activityTypeId: session.activityTypeId,
          notes: session.notes ?? "",
          facilitators: session.facilitators.map((f) => f.name),
          counts,
        }}
      />
    </div>
  );
}
