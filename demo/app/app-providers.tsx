"use client";

import type { ReactNode } from "react";
import { PollarAppProvider } from "./providers";

const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

/**
 * @file demo/app/app-providers.tsx
 *
 * Conditionally wraps children with PollarAppProvider (Mode B) when
 * NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY is set, or passes through cleanly
 * (Mode A — Freighter) when it is not.
 *
 * The PollarConfigBanner has been removed from here — it was shown even
 * when Freighter mode was the intended path. Banner/connection UI is now
 * handled inside page.tsx so the layout stays banner-free in Freighter mode.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!apiKey) {
    // Mode A — Freighter. No Pollar provider needed; render children directly.
    return <>{children}</>;
  }

  // Mode B — Pollar. Wrap with the Pollar session provider.
  return <PollarAppProvider apiKey={apiKey}>{children}</PollarAppProvider>;
}