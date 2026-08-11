import type { Sex } from "@prisma/client";

/**
 * The participant matrix as a flat map, so it can travel through form state,
 * a server action and the database without changing shape.
 * Key is `${keyPopulationId}:${MALE|FEMALE}`; a missing key means zero.
 */
export type Counts = Record<string, number>;

export const countKey = (keyPopulationId: string, sex: Sex | "MALE" | "FEMALE") =>
  `${keyPopulationId}:${sex}`;

export function sumCounts(counts: Counts) {
  return Object.values(counts).reduce((total, n) => total + (n || 0), 0);
}
