import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompiledCircuit } from "@noir-lang/noir_js";

const sdkRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(sdkRoot, "..", "..");

export type CircuitName = "proof_of_funds" | "private_escrow" | "milestone_release";

export function circuitArtifactPath(name: CircuitName): string {
  return join(repoRoot, "circuits", name, "target", `${name}.json`);
}

export function loadCircuit(name: CircuitName): CompiledCircuit {
  const path = circuitArtifactPath(name);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as CompiledCircuit;
}
