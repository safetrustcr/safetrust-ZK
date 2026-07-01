import type { MilestoneReleaseInput, MilestoneReleaseResult } from "../index.js";
import { loadCircuit } from "../circuits.js";
import { bigintToNoirInput, fieldToHex } from "../crypto/field.js";
import { pedersenHash } from "../crypto/pedersen.js";
import { generateUltraHonkProof, parseFieldOutput } from "./shared.js";

export async function computeAmountCommitment(
  totalAmount: bigint,
  randomness: bigint,
): Promise<string> {
  const hash = await pedersenHash([totalAmount, randomness]);
  return fieldToHex(hash);
}

export async function proveMilestoneRelease(
  input: MilestoneReleaseInput,
): Promise<MilestoneReleaseResult> {
  const circuit = loadCircuit("milestone_release");
  const amountCommitment =
    input.amountCommitment ||
    (await computeAmountCommitment(input.totalAmount, BigInt(input.randomness)));

  const { proof, returnValue, valid } = await generateUltraHonkProof(circuit, {
    total_amount: bigintToNoirInput(input.totalAmount),
    randomness: input.randomness,
    milestone_pct: String(input.milestonePct),
    amount_commitment: amountCommitment,
  });

  return {
    proof,
    releaseCommitment: parseFieldOutput(returnValue),
    valid,
  };
}
