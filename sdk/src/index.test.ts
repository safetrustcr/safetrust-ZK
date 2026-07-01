import { describe, expect, it } from "vitest";
import { SafeTrustZK } from "./index.js";
import { buildProofMemo, formatProofForStellar } from "./stellar.js";
import { circuitArtifactPath } from "./circuits.js";
import { existsSync } from "node:fs";
import { proveOfFunds } from "./provers/proofOfFunds.js";
import { commitEscrowAmount } from "./provers/privateEscrow.js";
import { proveMilestoneRelease } from "./provers/milestoneRelease.js";
import { decryptEscrowAmount } from "./viewKey.js";

const circuitsReady =
  existsSync(circuitArtifactPath("proof_of_funds")) &&
  existsSync(circuitArtifactPath("private_escrow")) &&
  existsSync(circuitArtifactPath("milestone_release"));

describe("SafeTrustZK", () => {
  it("exposes API", () => {
    const zk = new SafeTrustZK();
    expect(zk).toBeInstanceOf(SafeTrustZK);
  });
});

describe("stellar", () => {
  it("builds proof memo", () => {
    expect(buildProofMemo("abc123")).toEqual({ type: "hash", value: "abc123" });
  });

  it("formats proof bundle for Stellar verifier", () => {
    const bundle = formatProofForStellar({
      publicInputs: ["10000000000"],
      proof: Uint8Array.from([1, 2, 3, 4]),
    });
    expect(bundle.publicInputs.length).toBe(32);
    expect(bundle.proofBytes).toEqual(Uint8Array.from([1, 2, 3, 4]));
    expect(bundle.memo.type).toBe("hash");
    expect(bundle.stellarCompatible).toBe(false);
  });
});

describe.skipIf(!circuitsReady)("proof_of_funds prover (ZK-009)", () => {
  it("generates a verifiable UltraHonk proof", async () => {
    const result = await proveOfFunds(
      { balance: 15_000_000_000n, threshold: 10_000_000_000n },
      { randomness: "12345" },
    );

    expect(result.valid).toBe(true);
    expect(result.proof.length).toBeGreaterThan(0);
    expect(result.commitment).toBe(
      "0x1828cafdc870c45b36fbc71cc2ba992a3f650f5693c48c16b2504d9da9e2f246",
    );
  }, 120_000);

  it("rejects insufficient balance at witness generation", async () => {
    await expect(
      proveOfFunds(
        { balance: 5_000_000_000n, threshold: 10_000_000_000n },
        { randomness: "12345" },
      ),
    ).rejects.toThrow();
  }, 60_000);
});

describe.skipIf(!circuitsReady)("private_escrow prover (ZK-011)", () => {
  it("commits and encrypts escrow amount", async () => {
    const result = await commitEscrowAmount(
      {
        amount: 10_000_000_000n,
        guestAddress: "GUEST",
        hostAddress: "HOST",
      },
      {
        randomness: "77",
        viewKey: "42",
        guestAddr: "1",
        hostAddr: "2",
      },
    );

    expect(result.proof.length).toBeGreaterThan(0);
    expect(result.commitment.startsWith("0x")).toBe(true);
    expect(result.encryptedAmount).toHaveLength(32);
    expect(result.randomness).toBe("77");

    const amount = await decryptEscrowAmount(result.encryptedAmount, {
      viewKey: 42n,
      guestAddr: 1n,
      hostAddr: 2n,
    });
    expect(amount).toBe(10_000_000_000n);
  }, 120_000);
});

describe.skipIf(!circuitsReady)("milestone_release prover (ZK-012)", () => {
  it("proves 70% release against committed total", async () => {
    const escrow = await commitEscrowAmount(
      {
        amount: 10_000_000_000n,
        guestAddress: "GUEST",
        hostAddress: "HOST",
      },
      { randomness: "99", viewKey: "42", guestAddr: "1", hostAddr: "2" },
    );

    const result = await proveMilestoneRelease({
      amountCommitment: escrow.commitment,
      totalAmount: 10_000_000_000n,
      milestonePct: 70,
      randomness: escrow.randomness,
    });

    expect(result.valid).toBe(true);
    expect(result.releaseCommitment.startsWith("0x")).toBe(true);
    expect(result.proof.length).toBeGreaterThan(0);
  }, 180_000);

  it("proves 30% checkout release", async () => {
    const result = await proveMilestoneRelease({
      amountCommitment:
        "0x242eca2a99462c2af55acfe80fd39ad5c4524c757f38c6cdd0ef6785db652597",
      totalAmount: 10_000_000_000n,
      milestonePct: 30,
      randomness: "99",
    });
    expect(result.valid).toBe(true);
  }, 120_000);
});

describe.skipIf(!circuitsReady)("proveAndCommitEscrow (ZK-014)", () => {
  it("chains funds proof and escrow commit", async () => {
    const zk = new SafeTrustZK();
    const result = await zk.proveAndCommitEscrow({
      balance: 15_000_000_000n,
      amount: 10_000_000_000n,
      guestAddress: "GUEST",
      hostAddress: "HOST",
    });

    expect(result.fundsProof.valid).toBe(true);
    expect(result.escrow.commitment.startsWith("0x")).toBe(true);
  }, 180_000);
});
