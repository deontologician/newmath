import { z } from "zod";

// --- Input: what the UI sends ---

export const ConstraintName = z.enum([
  "associativity",
  "commutativity",
  "leftIdentity",
  "rightIdentity",
  "leftZero",
  "rightZero",
  "diversity",
  "idempotent",
  "medial",
  "leftDistributive",
  "rightDistributive",
  "leftCancellative",
  "rightCancellative",
]);
export type ConstraintName = z.infer<typeof ConstraintName>;

export const SolverConfig = z.object({
  symbolCount: z.number().int().min(2).max(4),
  constraints: z.array(ConstraintName).min(1),
});
export type SolverConfig = z.infer<typeof SolverConfig>;

// --- Output: what the solver returns ---
// MiniZinc JSON mode returns op as a nested array: [[1,2],[2,1]]

export const SolverResult = z.object({
  op: z.array(z.array(z.number().int().min(1))),
});
export type SolverResult = z.infer<typeof SolverResult>;
