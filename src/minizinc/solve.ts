import * as MiniZinc from "minizinc";
import { SolverConfig, SolverResult } from "./schema.ts";
import { generateMzn } from "./generate.ts";

/** Ensure MiniZinc WASM is initialized (idempotent). */
let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = MiniZinc.init({
      workerURL: "/wasm/minizinc-worker.js",
      wasmURL: "/wasm/minizinc.wasm",
      dataURL: "/wasm/minizinc.data",
    });
  }
  return initPromise;
}

/** Solve a single configuration and return the first satisfying result. */
export async function solve(
  config: SolverConfig
): Promise<SolverResult> {
  const validConfig = SolverConfig.parse(config);
  const mzn = generateMzn(validConfig);

  await ensureInit();

  const model = new MiniZinc.Model();
  model.addFile("model.mzn", mzn);

  const result = await model.solve({ options: { solver: "highs" } });

  if (result.status === "UNSATISFIABLE") {
    throw new Error("No satisfying operation table exists for this configuration");
  }
  if (result.status === "ERROR" || !result.solution) {
    throw new Error(`Solver failed with status: ${result.status}`);
  }

  return SolverResult.parse(result.solution.output.json);
}

/** Solve and collect all solutions via the 'solution' event. */
export async function solveAll(
  config: SolverConfig
): Promise<SolverResult[]> {
  const validConfig = SolverConfig.parse(config);
  const mzn = generateMzn(validConfig);

  await ensureInit();

  const model = new MiniZinc.Model();
  model.addFile("model.mzn", mzn);

  const solutions: SolverResult[] = [];

  const progress = model.solve({
    options: { solver: "highs", "all-solutions": true },
  });

  progress.on("solution", (e) => {
    const parsed = SolverResult.safeParse(e.output.json);
    if (parsed.success) {
      solutions.push(parsed.data);
    }
  });

  await progress;
  return solutions;
}
