import { randomBytes } from "@aztec/bb.js";
import { decryptAmount, encryptAmount } from "./crypto/aes.js";
import { fieldToHex, hexToBytes } from "./crypto/field.js";

export interface ViewKeyMaterial {
  viewKey: bigint;
  guestAddr: bigint;
  hostAddr: bigint;
}

export function deriveViewKeyMaterial(
  guestAddress: string,
  hostAddress: string,
  sharedSecret?: bigint,
): ViewKeyMaterial {
  const guestAddr = addressToField(guestAddress);
  const hostAddr = addressToField(hostAddress);
  const viewKey = sharedSecret ?? randomViewKeyField();
  return { viewKey, guestAddr, hostAddr };
}

export function randomViewKeyField(): bigint {
  const bytes = randomBytes(31);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte);
  }
  return value;
}

export function addressToField(address: string): bigint {
  const normalized = address.startsWith("0x") ? address.slice(2) : address;
  const hex = Buffer.from(normalized, "utf8").toString("hex");
  return BigInt(`0x${hex.slice(0, 16).padEnd(16, "0")}`);
}

export async function encryptEscrowAmount(
  amount: bigint,
  material: ViewKeyMaterial,
): Promise<Uint8Array> {
  return encryptAmount(amount, material.viewKey, material.guestAddr, material.hostAddr);
}

export async function decryptEscrowAmount(
  encrypted: Uint8Array,
  material: ViewKeyMaterial,
): Promise<bigint> {
  return decryptAmount(encrypted, material.viewKey, material.guestAddr, material.hostAddr);
}

export function viewKeyToBytes(viewKey: bigint): Uint8Array {
  return hexToBytes(fieldToHex(viewKey));
}
