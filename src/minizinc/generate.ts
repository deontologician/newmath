import type { SolverConfig } from "./schema.ts";
import { constraintRegistry } from "./constraints.ts";

/**
 * Generate a MiniZinc model string from a validated solver config.
 *
 * @throws {RangeError} if symbolCount is out of the 2–4 range
 */
export function generateMzn(config: SolverConfig): string {
  const { symbolCount, constraints } = config;
  if (symbolCount < 2 || symbolCount > 4) {
    throw new RangeError(
      `symbolCount must be 2–4, got ${String(symbolCount)}`
    );
  }

  const preamble = [
    `int: n = ${String(symbolCount)};`,
    "set of int: S = 1..n;",
    "array[S,S] of var S: op;",
  ].join("\n");

  const constraintBlock = constraints
    .map((name) => constraintRegistry[name].mzn)
    .join("\n");

  const solve = "solve satisfy;";

  // Human-readable output for CLI debugging; WASM path uses JSON mode.
  const output = [
    `output [`,
    `    "Operation table (row * col):\\n",`,
    `    "  * | " ++ join("  ", [show(j) | j in S]) ++ "\\n",`,
    `    " ---+" ++ join("", ["---" | _ in S]) ++ "\\n"`,
    `] ++ [`,
    `    "  " ++ show(i) ++ " | " ++ join("  ", [show(op[i, j]) | j in S]) ++ "\\n"`,
    `    | i in S`,
    `];`,
  ].join("\n");

  return [preamble, "", constraintBlock, "", solve, "", output, ""].join("\n");
}
