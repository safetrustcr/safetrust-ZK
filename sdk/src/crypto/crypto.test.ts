import { describe, expect, it } from "vitest";
import { encryptAmount, decryptAmount } from "./aes.js";
import { pedersenHash } from "./pedersen.js";
import { fieldToHex } from "./field.js";

describe("pedersen", () => {
  it("matches proof_of_funds test vector", async () => {
    const hash = await pedersenHash([15_000_000_000n, 12_345n]);
    expect(fieldToHex(hash)).toBe(
      "0x1828cafdc870c45b36fbc71cc2ba992a3f650f5693c48c16b2504d9da9e2f246",
    );
  });
});

describe("aes escrow encryption", () => {
  it("roundtrips amount with view key material", async () => {
    const amount = 10_000_000_000n;
    const viewKey = 42n;
    const guest = 1n;
    const host = 2n;
    const encrypted = await encryptAmount(amount, viewKey, guest, host);
    const decrypted = await decryptAmount(encrypted, viewKey, guest, host);
    expect(decrypted).toBe(amount);
  });

  it("matches private_escrow Prover.toml vector", async () => {
    const encrypted = await encryptAmount(10_000_000_000n, 42n, 1n, 2n);
    expect(Array.from(encrypted.slice(0, 16))).toEqual([
      145, 202, 42, 99, 241, 132, 139, 56, 14, 78, 130, 44, 212, 242, 169, 38,
    ]);
  });

  it("changes ciphertext when host changes", async () => {
    const amount = 10_000_000_000n;
    const encA = await encryptAmount(amount, 42n, 1n, 2n);
    const encB = await encryptAmount(amount, 42n, 1n, 3n);
    expect(Buffer.from(encA).equals(Buffer.from(encB))).toBe(false);
  });
});
