import type { CommitEscrowInput, CommitEscrowResult } from "../index.js";
import { loadCircuit } from "../circuits.js";
import { bigintToNoirInput, fieldToHex, randomField } from "../crypto/field.js";
import { addressToField } from "../viewKey.js";
import { generateUltraHonkProof, parseTupleOutput } from "./shared.js";

export interface CommitEscrowOptions {
  randomness?: string;
  viewKey?: string;
  guestAddr?: string;
  hostAddr?: string;
}

export async function commitEscrowAmount(
  input: CommitEscrowInput,
  options: CommitEscrowOptions = {},
): Promise<CommitEscrowResult> {
  const circuit = loadCircuit("private_escrow");
  const randomness = options.randomness ?? randomField();
  const viewKey = options.viewKey ?? randomField();
  const guestAddr = options.guestAddr ?? addressToField(input.guestAddress).toString();
  const hostAddr = options.hostAddr ?? addressToField(input.hostAddress).toString();

  const { proof, returnValue, valid } = await generateUltraHonkProof(circuit, {
    amount: bigintToNoirInput(input.amount),
    randomness,
    view_key: viewKey,
    guest_addr: guestAddr,
    host_addr: hostAddr,
  });

  if (!valid) {
    throw new Error("private_escrow proof failed local verification");
  }

  const [commitment, encryptedAmount] = parseTupleOutput(returnValue);
  const viewKeyBytes = fieldToHex(viewKey);

  return {
    proof,
    commitment,
    encryptedAmount,
    viewKey: Uint8Array.from(Buffer.from(viewKeyBytes.slice(2), "hex")),
    randomness,
  };
}
