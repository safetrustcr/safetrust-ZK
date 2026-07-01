import { commitEscrowAmount } from "./provers/privateEscrow.js";
import { proveMilestoneRelease } from "./provers/milestoneRelease.js";
import { proveOfFunds } from "./provers/proofOfFunds.js";

export interface ProofOfFundsInput {
  balance: bigint;
  threshold: bigint;
}

export interface ProofOfFundsResult {
  proof: Uint8Array;
  commitment: string;
  valid: boolean;
}

export interface CommitEscrowInput {
  amount: bigint;
  guestAddress: string;
  hostAddress: string;
}

export interface CommitEscrowResult {
  proof: Uint8Array;
  commitment: string;
  encryptedAmount: Uint8Array;
  viewKey: Uint8Array;
  randomness: string;
}

export interface MilestoneReleaseInput {
  amountCommitment: string;
  totalAmount: bigint;
  milestonePct: 70 | 30;
  randomness: string;
}

export interface MilestoneReleaseResult {
  proof: Uint8Array;
  releaseCommitment: string;
  valid: boolean;
}

export interface ProveAndCommitEscrowInput extends CommitEscrowInput {
  balance: bigint;
}

export interface ProveAndCommitEscrowResult {
  fundsProof: ProofOfFundsResult;
  escrow: CommitEscrowResult;
}

/**
 * Public API entry point for the SafeTrust ZK layer (ZK-014).
 * Provers lazy-load WASM at call time to avoid SSR window errors.
 */
export class SafeTrustZK {
  async proveOfFunds(input: ProofOfFundsInput): Promise<ProofOfFundsResult> {
    return proveOfFunds(input);
  }

  async commitEscrowAmount(input: CommitEscrowInput): Promise<CommitEscrowResult> {
    return commitEscrowAmount(input);
  }

  async proveMilestoneRelease(input: MilestoneReleaseInput): Promise<MilestoneReleaseResult> {
    return proveMilestoneRelease(input);
  }

  async proveAndCommitEscrow(
    input: ProveAndCommitEscrowInput,
  ): Promise<ProveAndCommitEscrowResult> {
    const fundsProof = await this.proveOfFunds({
      balance: input.balance,
      threshold: input.amount,
    });
    const escrow = await this.commitEscrowAmount({
      amount: input.amount,
      guestAddress: input.guestAddress,
      hostAddress: input.hostAddress,
    });
    return { fundsProof, escrow };
  }
}

export { SafeTrustZK as default };
export {
  buildProofMemo,
  formatProofForStellar,
  isStellarVerifierCompatible,
  STELLAR_ULTRAHONK_PROOF_BYTES,
  STELLAR_ULTRAHONK_VK_BYTES,
  type StellarProofBundle,
} from "./stellar.js";
