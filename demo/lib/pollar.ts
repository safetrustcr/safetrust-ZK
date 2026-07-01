import { Networks } from "@creit.tech/stellar-wallets-kit";

export type StellarNetwork = "mainnet" | "testnet";

/** Host only — PollarClient appends `/v1` internally. Do NOT include `/v1` here. */
export const POLLAR_BASE_URL =
  process.env.NEXT_PUBLIC_POLLAR_BASE_URL ?? "https://sdk.api.pollar.xyz";

export function resolveStellarNetwork(): StellarNetwork {
  const fromEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toLowerCase();
  return fromEnv === "mainnet" ? "mainnet" : "testnet";
}

export function kitNetwork(network: StellarNetwork): Networks {
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}
