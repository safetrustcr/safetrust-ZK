import { Barretenberg } from "@aztec/bb.js";

const BN254_FR_MODULUS = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

export function fieldToBuffer(value: bigint): Uint8Array {
  const reduced = ((value % BN254_FR_MODULUS) + BN254_FR_MODULUS) % BN254_FR_MODULUS;
  const out = new Uint8Array(32);
  let v = reduced;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function bufferToField(buffer: Uint8Array): bigint {
  let value = 0n;
  for (const byte of buffer) {
    value = (value << 8n) + BigInt(byte);
  }
  return value;
}

let bbSingleton: Barretenberg | null = null;

export async function getBarretenberg(): Promise<Barretenberg> {
  if (!bbSingleton) {
    bbSingleton = await Barretenberg.new();
  }
  return bbSingleton;
}

export async function pedersenHash(inputs: bigint[]): Promise<bigint> {
  const bb = await getBarretenberg();
  const response = await bb.pedersenHash({
    inputs: inputs.map(fieldToBuffer),
    hashIndex: 0,
  });
  return bufferToField(response.hash);
}

export async function destroyBarretenberg(): Promise<void> {
  if (bbSingleton) {
    await bbSingleton.destroy();
    bbSingleton = null;
  }
}
