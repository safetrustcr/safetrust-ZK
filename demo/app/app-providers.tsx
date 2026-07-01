"use client";

import type { ReactNode } from "react";
import { PollarConfigBanner } from "./components/PollarWalletBar";
import { PollarAppProvider } from "./providers";

const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

export function AppProviders({ children }: { children: ReactNode }) {
  if (!apiKey) {
    return (
      <>
        <PollarConfigBanner />
        {children}
      </>
    );
  }

  return <PollarAppProvider apiKey={apiKey}>{children}</PollarAppProvider>;
}
