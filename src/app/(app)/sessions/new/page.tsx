import { canAddCommunity, requireUser } from "@/lib/auth";
import { getSessionFormData } from "@/lib/sessions";
import { PageHeader } from "@/components/layout/page-header";
import { SessionForm } from "@/components/sessions/session-form";

export const metadata = { title: "Log a session" };

export default async function NewSessionPage() {
  const [user, data] = await Promise.all([requireUser(), getSessionFormData()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="New entry"
        title="Log a community session"
        description="Type up a paper attendance sheet. Only the date and community are required — leave anything you don't have blank."
        breadcrumbs={[{ label: "Sessions", href: "/sessions" }, { label: "New" }]}
      />
      <SessionForm
        data={data}
        canAddCommunity={canAddCommunity(user)}
        initial={{
          date: new Date().toISOString().slice(0, 10),
          communityId: null,
          projectId: null,
          thematicAreaId: null,
          ageGroupId: null,
          activityTypeId: null,
          notes: "",
          facilitators: [],
          counts: {},
        }}
      />
    </div>
  );
}
