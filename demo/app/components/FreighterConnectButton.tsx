"use client";

import { useState } from "react";

interface Props {
  onAddress: (address: string) => void;
}

export function FreighterConnectButton({ onAddress }: Props) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);

    try {
      // Use @stellar/freighter-api directly — most reliable approach
      // Lazy import to avoid SSR window errors
      const freighter = await import("@stellar/freighter-api");

      const connected = await freighter.isConnected();
      if (!connected) {
        setError("Freighter not found — install the extension at freighter.app");
        return;
      }

      await freighter.requestAccess();

      const { address: addr } = await freighter.getAddress();

      setAddress(addr);
      onAddress(addr);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message.includes("User declined") 
        ? "Connection rejected — approve in Freighter and try again"
        : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wallet-bar">
      <div>
        <p className="wallet-bar-label">Guest wallet</p>
        {address ? (
          <p className="wallet-bar-address">
            {address.slice(0, 10)}&hellip;{address.slice(-8)}
          </p>
        ) : (
          <p className="wallet-bar-hint">
            Freighter browser extension &mdash;{" "}
            <a href="https://freighter.app" target="_blank" rel="noreferrer">
              freighter.app
            </a>
          </p>
        )}
        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.35rem" }}>
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void connect()}
        disabled={loading || !!address}
      >
        {loading && <span className="spinner" aria-hidden />}
        {address ? "Connected ✓" : "Connect Freighter"}
      </button>
    </div>
  );
}
