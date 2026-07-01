import { createCipheriv, createDecipheriv } from "node:crypto";
import { pedersenHash } from "./pedersen.js";
import { fieldToLeBytes } from "./field.js";

export async function deriveAesKey(
  viewKey: bigint,
  guestAddr: bigint,
  hostAddr: bigint,
): Promise<Uint8Array> {
  const seed = await pedersenHash([viewKey, guestAddr, hostAddr]);
  return fieldToLeBytes(seed).slice(0, 16);
}

export function amountToLeBytes(amount: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let value = amount;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
}

export function leBytesToAmount(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) + BigInt(bytes[i] ?? 0);
  }
  return value;
}

/** AES-128-CBC with zero IV and PKCS#7 padding (matches Noir stdlib). */
export async function encryptAmount(
  amount: bigint,
  viewKey: bigint,
  guestAddr: bigint,
  hostAddr: bigint,
): Promise<Uint8Array> {
  const key = await deriveAesKey(viewKey, guestAddr, hostAddr);
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv("aes-128-cbc", Buffer.from(key), iv);
  const plaintext = Buffer.from(amountToLeBytes(amount));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const out = new Uint8Array(32);
  out.set(ciphertext.subarray(0, 16), 0);
  return out;
}

export async function decryptAmount(
  encrypted: Uint8Array,
  viewKey: bigint,
  guestAddr: bigint,
  hostAddr: bigint,
): Promise<bigint> {
  const key = await deriveAesKey(viewKey, guestAddr, hostAddr);
  const iv = Buffer.alloc(16, 0);
  const decipher = createDecipheriv("aes-128-cbc", Buffer.from(key), iv);
  const ciphertext = Buffer.from(encrypted.slice(0, 16));
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return leBytesToAmount(Uint8Array.from(plaintext));
}
