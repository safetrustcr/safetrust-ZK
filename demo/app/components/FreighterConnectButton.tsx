"use client";

import { useState } from "react";

/**
 * @file demo/app/components/FreighterConnectButton.tsx
 *
 * Zero-account-required wallet connection via Freighter.
 * Used when NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY is not set.
 *
 * @creit.tech/stellar-wallets-kit v2.5.0 — BREAKING CHANGES vs earlier versions:
 *   - StellarWalletsKit is now a STATIC-only class (no `new`, no instance)
 *   - FREIGHTER_ID is exported from the separate module path, not the root
 *   - Must call StellarWalletsKit.setWallet(id) before StellarWalletsKit.getAddress()
 *   - Networks enum is exported from the root package
 *
 * Lazy-imported inside the click handler — never at module level — to avoid
 * SSR crashes from the kit accessing `window` at import time.
 */

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
      // Lazy imports — keep inside the event handler, never at module level
      const [{ StellarWalletsKit, Networks }, { FREIGHTER_ID }] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit"),
        import("@creit.tech/stellar-wallets-kit/modules/freighter"),
      ]);

      // v2.5.0: fully static API — no instantiation needed
      StellarWalletsKit.setNetwork(Networks.TESTNET);
      StellarWalletsKit.setWallet(FREIGHTER_ID);

      // fetchAddress requests the address directly from the Freighter extension
      const { address: addr } = await StellarWalletsKit.fetchAddress();

      setAddress(addr);
      onAddress(addr);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";

      const hint =
        message.toLowerCase().includes("freighter") ||
        message.toLowerCase().includes("not available")
          ? "Freighter not found — install the extension at freighter.app"
          : message;

      setError(hint);
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