import { randomBytes } from "@aztec/bb.js";

/** Random field element as a decimal string (Noir input). */
export function randomField(): string {
  const bytes = randomBytes(31);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte);
  }
  return value.toString();
}

export function bigintToNoirInput(value: bigint): string {
  return value.toString();
}

export function fieldToHex(value: string | bigint): string {
  const bigint = typeof value === "bigint" ? value : BigInt(value);
  return `0x${bigint.toString(16).padStart(64, "0")}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

/** Field element to 32-byte little-endian (matches Noir `to_le_bytes`). */
export function fieldToLeBytes(field: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let value = field;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
}
