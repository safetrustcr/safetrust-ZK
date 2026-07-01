import { PollarClient, type PollarClientConfig } from "@pollar/core";

let cachedClient: PollarClient | null = null;
let cachedKey = "";

/** One client per API key — avoids duplicate-session warnings in React Strict Mode. */
export function getPollarClient(config: PollarClientConfig): PollarClient {
  const key = `${config.apiKey}:${config.stellarNetwork ?? "testnet"}:${config.baseUrl ?? ""}`;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }
  cachedClient = new PollarClient(config);
  cachedKey = key;
  return cachedClient;
}
