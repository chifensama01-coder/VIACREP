import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "./db";

const COOKIE_NAME = "viac_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // one week

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set — copy .env.example to .env before starting.",
    );
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation: string | null;
  divisionId: string | null;
  divisionName: string | null;
};

/* -------------------------------------------------------------------------- */
/* Sign in / sign out                                                          */
/* -------------------------------------------------------------------------- */

export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    // Hash anyway so a missing account and a wrong password take the same time.
    await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinva");
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/* -------------------------------------------------------------------------- */
/* Reading the current user                                                    */
/* -------------------------------------------------------------------------- */

/** `cache` dedupes this across the many server components that ask per render. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { division: { select: { id: true, name: true } } },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    divisionId: user.divisionId,
    divisionName: user.division?.name ?? null,
  };
});

/** For pages that must have a user; the layout redirects, this is the guard. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

export const ROLE_LABELS: Record<Role, string> = {
  OFFICER: "Field Officer",
  COORDINATOR: "Coordinator",
  APPROVER: "Approver",
};

/** Coordinators and approvers see the whole organisation. */
export function seesEverything(user: SessionUser) {
  return user.role === Role.COORDINATOR || user.role === Role.APPROVER;
}

/** Managing lookup lists, geography and the letterhead is coordinator work. */
export function canManageSettings(user: SessionUser) {
  return user.role === Role.COORDINATOR;
}

/**
 * Per the brief: coordinators add new communities. Officers pick from the list.
 */
export function canAddCommunity(user: SessionUser) {
  return user.role === Role.COORDINATOR;
}

/** Officers may only change sessions they logged. */
export function canEditSession(user: SessionUser, createdById: string) {
  return seesEverything(user) || user.id === createdById;
}

/**
 * Report authoring is deliberately open to every role — the brief is explicit
 * that roles scope what you can see, not whether you can write a report.
 */
export function canWriteReports() {
  return true;
}
