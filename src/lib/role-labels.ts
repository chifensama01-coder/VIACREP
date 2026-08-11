import type { Role } from "@prisma/client";

/** Client-safe labels — `lib/auth.ts` is server-only and can't be imported here. */
export const ROLE_LABEL_BY_ROLE: Record<Role, string> = {
  OFFICER: "Officer",
  COORDINATOR: "Coordinator",
  APPROVER: "Approver",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OFFICER: "Logs sessions and writes reports; sees their own and their division's data.",
  COORDINATOR: "Sees everything; manages lookup lists, geography and the letterhead.",
  APPROVER: "Sees everything; signs reports off as the approving officer.",
};
