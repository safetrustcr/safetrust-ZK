"use client";

import type { ReactNode } from "react";
import { PollarAppProvider } from "./providers";

const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

export function AppProviders({ children }: { children: ReactNode }) {
  if (!apiKey) {
    return <>{children}</>;
  }
  return <PollarAppProvider apiKey={apiKey}>{children}</PollarAppProvider>;
}
