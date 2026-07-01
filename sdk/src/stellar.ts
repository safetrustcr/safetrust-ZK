import { bytesToHex } from "./crypto/field.js";

export interface ProofData {
  publicInputs: string[];
  proof: Uint8Array;
}

export function buildProofMemo(proofHash: string): { type: "hash"; value: string } {
  return { type: "hash", value: proofHash };
}

/** Byte sizes expected by rs-soroban-ultrahonk (Barretenberg v0.87.0, keccak). */
export const STELLAR_ULTRAHONK_VK_BYTES = 1760;
export const STELLAR_ULTRAHONK_PROOF_BYTES = 14592;

export function isStellarVerifierCompatible(proofBytes: Uint8Array): boolean {
  return proofBytes.length === STELLAR_ULTRAHONK_PROOF_BYTES;
}

/** Big-endian 32-byte field encoding (matches bb.js / Stellar verifier layout). */
export function flattenPublicInputs(fields: string[]): Uint8Array {
  const out = new Uint8Array(fields.length * 32);
  fields.forEach((field, index) => {
    const hex = BigInt(field).toString(16).padStart(64, "0");
    for (let i = 0; i < 32; i++) {
      out[index * 32 + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
  });
  return out;
}

export interface StellarProofBundle {
  publicInputs: Uint8Array;
  proofBytes: Uint8Array;
  publicInputsHex: string;
  proofHex: string;
  memo: { type: "hash"; value: string };
  /** True when proof length matches rs-soroban-ultrahonk (bb v0.87.0). */
  stellarCompatible: boolean;
}

export function formatProofForStellar(
  proofData: ProofData,
  memoValue?: string,
): StellarProofBundle {
  const publicInputs = flattenPublicInputs(proofData.publicInputs);
  const proofBytes = proofData.proof;
  const memoSource = memoValue ?? bytesToHex(proofBytes.slice(0, 32));

  return {
    publicInputs,
    proofBytes,
    publicInputsHex: bytesToHex(publicInputs),
    proofHex: bytesToHex(proofBytes),
    memo: buildProofMemo(memoSource),
    stellarCompatible: isStellarVerifierCompatible(proofBytes),
  };
}
