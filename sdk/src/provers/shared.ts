import { Barretenberg, UltraHonkBackend, type UltraHonkBackendOptions } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import type { CompiledCircuit, InputMap } from "@noir-lang/noir_js";
import { fieldToHex } from "../crypto/field.js";

export const PROVER_OPTIONS: UltraHonkBackendOptions = { verifierTarget: "evm" };

export function parseFieldOutput(value: unknown): string {
  if (typeof value === "string") {
    return fieldToHex(value);
  }
  if (typeof value === "bigint") {
    return fieldToHex(value);
  }
  throw new Error(`Unexpected Noir return value: ${String(value)}`);
}

export function parseTupleOutput(value: unknown): [string, Uint8Array] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`Expected tuple return value, got: ${String(value)}`);
  }
  const commitment = parseFieldOutput(value[0]);
  const encryptedRaw = value[1];
  if (!Array.isArray(encryptedRaw)) {
    throw new Error("Expected encrypted amount byte array");
  }
  const encrypted = Uint8Array.from(encryptedRaw.map((byte) => Number(byte)));
  return [commitment, encrypted];
}

export async function generateUltraHonkProof(
  circuit: CompiledCircuit,
  inputs: InputMap,
): Promise<{
  proof: Uint8Array;
  publicInputs: string[];
  returnValue: unknown;
  valid: boolean;
}> {
  const noir = new Noir(circuit);
  await noir.init();

  const bb = await Barretenberg.new();
  try {
    const backend = new UltraHonkBackend(circuit.bytecode, bb);
    const { witness, returnValue } = await noir.execute(inputs);
    const proofData = await backend.generateProof(witness, PROVER_OPTIONS);
    const valid = await backend.verifyProof(proofData, PROVER_OPTIONS);
    return {
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
      returnValue,
      valid,
    };
  } finally {
    await bb.destroy();
  }
}
