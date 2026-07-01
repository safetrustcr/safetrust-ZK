"use client";

import { WalletButton, usePollar } from "@pollar/react";
import { useEffect } from "react";

export function PollarWalletBar({
  onGuestAddress,
}: {
  onGuestAddress: (address: string | null) => void;
}) {
  const { wallet, verified, isAuthenticated } = usePollar();
  const connected = Boolean(wallet?.address && verified);

  useEffect(() => {
    if (connected && wallet?.address) {
      onGuestAddress(wallet.address);
    } else if (!isAuthenticated) {
      onGuestAddress(null);
    }
  }, [wallet?.address, verified, isAuthenticated, connected, onGuestAddress]);

  return (
    <div className="wallet-bar">
      <div>
        <p className="wallet-bar-label">Guest wallet</p>
        {connected ? (
          <p className="wallet-bar-address">
            {wallet!.address.slice(0, 10)}…{wallet!.address.slice(-8)}
          </p>
        ) : (
          <p className="wallet-bar-hint">Google, email, or Stellar extension via Pollar</p>
        )}
      </div>
      <WalletButton />
    </div>
  );
}

export function PollarConfigBanner() {
  return (
    <div className="banner banner-warning" role="status">
      Set <code>NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY</code> in <code>demo/.env.local</code> from{" "}
      <a href="https://dashboard.pollar.xyz" target="_blank" rel="noreferrer">
        dashboard.pollar.xyz
      </a>
      , and allow <code>http://localhost:3000</code> under Domains.
    </div>
  );
}
