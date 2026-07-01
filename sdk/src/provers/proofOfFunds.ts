import type { ProofOfFundsInput, ProofOfFundsResult } from "../index.js";
import { loadCircuit } from "../circuits.js";
import { bigintToNoirInput, fieldToHex, randomField } from "../crypto/field.js";
import { generateUltraHonkProof, parseFieldOutput } from "./shared.js";

export interface ProveOfFundsOptions {
  randomness?: string;
}

export async function proveOfFunds(
  input: ProofOfFundsInput,
  options: ProveOfFundsOptions = {},
): Promise<ProofOfFundsResult> {
  const circuit = loadCircuit("proof_of_funds");
  const randomness = options.randomness ?? randomField();

  const { proof, returnValue, valid } = await generateUltraHonkProof(circuit, {
    balance: bigintToNoirInput(input.balance),
    randomness,
    threshold: bigintToNoirInput(input.threshold),
  });

  return {
    proof,
    commitment: parseFieldOutput(returnValue),
    valid,
  };
}

export function formatProofOfFundsMemo(result: ProofOfFundsResult): string {
  return fieldToHex(result.commitment);
}
